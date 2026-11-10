package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.application.port.out.PushSenderPort;
import com.vinnot.notification.domain.model.NotificationType;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.regex.Pattern;

/**
 * Expo Push API: {@code POST /send} with up to 100 messages and {@code POST /getReceipts} with up to 1000 ticket ids.
 *
 * <p>The payload carries the title, the body, sound, priority, the Android channel of the push's category (only when the
 * device created those channels, otherwise the legacy {@code default} one), a {@code ttl} derived from the push's
 * deadline and {@code data = {url, type, ref}}: the in-app route, the notification type and the push's dedupe key, which
 * the app reports back when the push is opened. Every send first waits for the shared {@link PushRateLimiter}.
 *
 * <p>Answers {@code 429} and {@code 5xx} are retried in place, honoring {@code Retry-After}, before the call fails and the
 * outbox retries the job. {@code 400} and {@code 413} mean the request itself is wrong and are never retried
 * ({@link PushSenderPort.RejectedException}). Per-message errors are logged and counted by code, never with the token.
 */
public class ExpoPushSenderAdapter implements PushSenderPort {
    /** The channel expo-notifications creates on Android; devices without the per-category channels only have this one. */
    static final String DEFAULT_CHANNEL = "default";
    static final String ERRORS_METER = "vinnot.push.provider.errors";
    private static final Duration FIRST_BACKOFF = Duration.ofSeconds(1);
    private static final Duration LONGEST_WAIT = Duration.ofSeconds(30);
    private static final int MAX_DOUBLINGS = 5;
    private static final Pattern ERROR_CODE = Pattern.compile("[A-Za-z]{1,48}");
    private static final Logger LOGGER = LoggerFactory.getLogger(ExpoPushSenderAdapter.class);
    private final RestClient client;
    private final PushRateLimiter limiter;
    private final MeterRegistry meters;
    private final Clock clock;
    private final int retries;
    private final Pause pause;

    /**
     * @param retries how many times a {@code 429} or {@code 5xx} answer is retried before the call fails
     */
    public ExpoPushSenderAdapter(RestClient client, PushRateLimiter limiter, MeterRegistry meters, Clock clock, int retries,
            Pause pause) {
        if (retries < 0) {
            throw new IllegalArgumentException("Push HTTP retries cannot be negative");
        }
        this.client = client;
        this.limiter = limiter;
        this.meters = meters;
        this.clock = clock;
        this.retries = retries;
        this.pause = pause;
    }

    @Override
    public List<Ticket> send(List<Message> messages) {
        if (messages.isEmpty()) {
            return List.of();
        }
        if (messages.size() > MAX_BATCH) {
            throw new IllegalArgumentException("Expo accepts at most " + MAX_BATCH + " messages per request");
        }
        limiter.acquire(messages.size());
        Instant now = clock.instant();
        List<Map<String, Object>> body = messages.stream().map(message -> message(message, now)).toList();
        Map<?, ?> response = post("/send", body);
        List<?> data = Objects.isNull(response) ? null : (List<?>) response.get("data");
        if (Objects.isNull(data) || data.size() != messages.size()) {
            throw new IllegalStateException("Expo returned no ticket per message");
        }
        List<Ticket> tickets = new ArrayList<>(messages.size());
        Map<String, Integer> errors = new TreeMap<>();
        for (int index = 0; index < messages.size(); index++) {
            Map<?, ?> ticket = (Map<?, ?>) data.get(index);
            String token = messages.get(index).token();
            if ("ok".equals(ticket.get("status"))) {
                tickets.add(new Ticket(token, (String) ticket.get("id"), null));
            } else {
                String error = error(ticket);
                errors.merge(error, 1, Integer::sum);
                tickets.add(new Ticket(token, null, error));
            }
        }
        report("ticket", errors);
        return tickets;
    }

    @Override
    public Map<String, Receipt> receipts(Collection<String> ticketIds) {
        if (ticketIds.isEmpty()) {
            return Map.of();
        }
        if (ticketIds.size() > MAX_RECEIPTS) {
            throw new IllegalArgumentException("Expo returns at most " + MAX_RECEIPTS + " receipts per request");
        }
        Map<?, ?> response = post("/getReceipts", Map.of("ids", List.copyOf(ticketIds)));
        Object data = Objects.isNull(response) ? null : response.get("data");
        if (!(data instanceof Map<?, ?> found)) {
            throw new IllegalStateException("Expo returned no receipts object");
        }
        Map<String, Receipt> receipts = new HashMap<>();
        Map<String, Integer> errors = new TreeMap<>();
        found.forEach((id, value) -> {
            Map<?, ?> receipt = (Map<?, ?>) value;
            if ("ok".equals(receipt.get("status"))) {
                receipts.put((String) id, new Receipt(true, null));
            } else {
                String error = error(receipt);
                errors.merge(error, 1, Integer::sum);
                receipts.put((String) id, new Receipt(false, error));
            }
        });
        report("receipt", errors);
        return receipts;
    }

    /** The Android channel of a push type: the category's own channel, announcements on the news channel. */
    static String androidChannel(NotificationType type) {
        if (type == NotificationType.SERVICE_NOTICE || type == NotificationType.ANNOUNCEMENT_TEST) {
            return "news";
        }
        return channelForCategory(type.category().name());
    }

    /** By name, so a category this mapping does not know yet falls back to the legacy channel instead of failing. */
    static String channelForCategory(String category) {
        return switch (category) {
            case "TICKETS", "PAYMENTS", "ACCOUNT", "SECURITY", "SUBMISSIONS", "SUPPORT", "MODERATION" -> "tickets";
            case "COMMUNITY" -> "community";
            case "RECOMMENDATIONS" -> "recommendations";
            case "EVENTS_NEARBY" -> "events-nearby";
            case "REMINDERS" -> "reminders";
            case "NEWSLETTER" -> "news";
            default -> DEFAULT_CHANNEL;
        };
    }

    private Map<?, ?> post(String path, Object body) {
        for (int attempt = 0; ; attempt++) {
            try {
                return client.post().uri(path).contentType(MediaType.APPLICATION_JSON).accept(MediaType.APPLICATION_JSON)
                        .body(body).retrieve().body(Map.class);
            } catch (RestClientResponseException failure) {
                int status = failure.getStatusCode().value();
                if (status == HttpStatus.BAD_REQUEST.value() || status == HttpStatus.CONTENT_TOO_LARGE.value()) {
                    throw new RejectedException("Expo rejected the push request with status " + status);
                }
                boolean transientFailure = status == HttpStatus.TOO_MANY_REQUESTS.value() || failure.getStatusCode().is5xxServerError();
                if (!transientFailure || attempt >= retries) {
                    throw failure;
                }
                pauseFor(backoff(attempt, failure.getResponseHeaders()));
            }
        }
    }

    private Duration backoff(int attempt, HttpHeaders headers) {
        String retryAfter = Objects.isNull(headers) ? null : headers.getFirst(HttpHeaders.RETRY_AFTER);
        Duration wait = FIRST_BACKOFF.multipliedBy(1L << Math.min(attempt, MAX_DOUBLINGS));
        if (Objects.nonNull(retryAfter)) {
            try {
                wait = Duration.ofSeconds(Long.parseLong(retryAfter.strip()));
            } catch (NumberFormatException notSeconds) {
                long date = headers.getFirstDate(HttpHeaders.RETRY_AFTER);
                if (date > 0) {
                    wait = Duration.between(clock.instant(), Instant.ofEpochMilli(date));
                }
            }
        }
        if (wait.isNegative()) {
            return Duration.ZERO;
        }
        return wait.compareTo(LONGEST_WAIT) > 0 ? LONGEST_WAIT : wait;
    }

    private void pauseFor(Duration duration) {
        try {
            pause.sleep(duration);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while backing off from the push provider", interrupted);
        }
    }

    private void report(String stage, Map<String, Integer> errors) {
        errors.forEach((code, count) -> {
            meters.counter(ERRORS_METER, "stage", stage, "code", code).increment(count);
            if (!DEVICE_NOT_REGISTERED.equals(code)) {
                LOGGER.warn("Expo {} error {} for {} push message(s)", stage, code, count);
            }
        });
    }

    private static Map<String, Object> message(Message message, Instant now) {
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("to", message.token());
        json.put("title", message.content().title());
        json.put("body", message.content().body());
        json.put("data", Map.of("url", message.content().route(), "type", message.type().name(), "ref", message.ref()));
        json.put("sound", "default");
        json.put("priority", message.urgent() ? "high" : "normal");
        json.put("channelId", message.channels() ? androidChannel(message.type()) : DEFAULT_CHANNEL);
        if (Objects.nonNull(message.expiresAt())) {
            json.put("ttl", Math.max(0, Duration.between(now, message.expiresAt()).toSeconds()));
        }
        return json;
    }

    /** The provider's error code; anything that is not a plain code is reported as {@code Unknown}. */
    private static String error(Map<?, ?> entry) {
        if (entry.get("details") instanceof Map<?, ?> details && details.get("error") instanceof String error
                && ERROR_CODE.matcher(error).matches()) {
            return error;
        }
        return "Unknown";
    }
}
