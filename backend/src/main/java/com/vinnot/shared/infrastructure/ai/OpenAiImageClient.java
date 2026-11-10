package com.vinnot.shared.infrastructure.ai;

import com.vinnot.shared.application.exception.AiImageGenerationException;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.application.port.AiImageService;
import com.vinnot.shared.application.port.AiProviderAdmissionPort;
import com.vinnot.shared.application.port.GeneratedImage;
import com.vinnot.shared.application.port.ImageEditRequest;
import com.vinnot.shared.application.port.ReferenceImage;
import com.vinnot.shared.infrastructure.metrics.OperationalTelemetry;
import com.vinnot.shared.infrastructure.metrics.OperationalTelemetry.AiOutcome;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * OpenAI images edits adapter: style references in, one PNG out. Mirrors {@link OpenAiClient}: bounded transport
 * without redirects, one admission permit per attempt, retries only on 429/5xx and never on transport timeouts.
 * A billed response that is not a usable image is rejected, not retried, so the caller falls back.
 */
@Component
@EnableConfigurationProperties(OpenAiImageProperties.class)
public class OpenAiImageClient implements AiImageService {

    private static final Logger LOG = LoggerFactory.getLogger(OpenAiImageClient.class);
    private static final int HTTP_REDIRECTION = 300;
    private static final int HTTP_TOO_MANY_REQUESTS = 429;
    private static final int HTTP_STATUS_UPPER_BOUND = 600;
    private static final long MAX_BACKOFF_MS = 2_000L;
    private static final long JITTER_MS = 100L;
    static final int MAX_RESPONSE_BYTES = 25 * 1024 * 1024;
    static final int MAX_REQUEST_BYTES = 25 * 1024 * 1024;
    private static final Set<String> BILLING_ERRORS = Set.of("insufficient_quota", "credit_balance_exhausted",
            "billing_hard_limit_reached", "organization_spend_limit_exceeded", "project_spend_limit_exceeded");
    private static final String CRLF = "\r\n";

    private final ObjectMapper objectMapper;
    private final OpenAiImageProperties properties;
    private final AiProviderAdmissionPort admission;
    private final OperationalTelemetry telemetry;
    private final URI editsUri;
    private final HttpClient httpClient;
    private final String apiKey;
    private final boolean aiEnabled;
    private final String aiProvider;

    public OpenAiImageClient(ObjectMapper objectMapper, OpenAiImageProperties properties,
            AiProviderAdmissionPort admission, OperationalTelemetry telemetry,
            @Value("${services.openai.images-url:https://api.openai.com/v1/images/edits}") String editsUrl,
            @Value("${services.openai.connect-timeout:10s}") Duration connectTimeout,
            @Value("${services.openai.api-key:}") String apiKey,
            @Value("${ai.enabled:false}") boolean aiEnabled,
            @Value("${ai.provider:mock}") String aiProvider) {
        if (connectTimeout.toMillis() < 1 || connectTimeout.compareTo(properties.timeout()) > 0) {
            throw new IllegalArgumentException("AI image connect timeout must be positive and within the timeout");
        }
        this.objectMapper = objectMapper;
        this.properties = properties;
        this.admission = admission;
        this.telemetry = telemetry;
        this.editsUri = URI.create(editsUrl);
        this.httpClient = HttpClient.newBuilder().connectTimeout(connectTimeout)
                .followRedirects(HttpClient.Redirect.NEVER).build();
        this.apiKey = apiKey;
        this.aiEnabled = aiEnabled;
        this.aiProvider = aiProvider;
    }

    @Override
    public boolean isAvailable() {
        return aiEnabled && properties.enabled() && "openai".equals(aiProvider)
                && Objects.nonNull(apiKey) && !apiKey.isBlank();
    }

    @Override
    public boolean isMockMode() {
        return "mock".equals(aiProvider);
    }

    @Override
    public GeneratedImage edit(ImageEditRequest request) {
        Objects.requireNonNull(request, "Image edit request is required");
        if (!isAvailable()) {
            throw AiImageGenerationException.unavailable("AI images are not available", null);
        }
        String size = Objects.requireNonNullElse(request.size(), properties.size());
        int attempts = properties.maxAttempts();
        long deadline = System.nanoTime() + properties.timeout().toNanos();
        Exception lastFailure = null;
        for (int attempt = 1; attempt <= attempts && System.nanoTime() < deadline; attempt++) {
            if (Thread.currentThread().isInterrupted()) {
                throw AiImageGenerationException.failed("AI image generation was interrupted", null);
            }
            try {
                return executeAttempt(request, size, deadline);
            } catch (AiImageGenerationException rejected) {
                throw rejected;
            } catch (ExternalServiceUnavailableException refused) {
                telemetry.recordAi(admissionOutcome(refused.getCode()));
                throw AiImageGenerationException.unavailable("AI image admission refused: " + refused.getCode(),
                        refused);
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                throw AiImageGenerationException.failed("AI image generation was interrupted", interrupted);
            } catch (Exception failure) {
                lastFailure = failure;
                LOG.warn("OpenAI image attempt {}/{} failed: {}", attempt, attempts, describe(failure));
                long delay = retryDelay(failure, attempt);
                long remainingMs = TimeUnit.NANOSECONDS.toMillis(deadline - System.nanoTime());
                if (attempt == attempts || delay < 0 || delay >= remainingMs || !pause(delay)) {
                    break;
                }
            }
        }
        throw AiImageGenerationException.failed("AI image generation failed", lastFailure);
    }

    private GeneratedImage executeAttempt(ImageEditRequest request, String size, long deadline) throws Exception {
        BigDecimal maximumCost = properties.maxCostUsd();
        var permit = admission.acquire(properties.model(), maximumCost);
        Optional<BigDecimal> observed = Optional.of(BigDecimal.ZERO);
        try {
            // Encoding occurs only after an execution permit and budget have been acquired.
            String boundary = "vinnot-" + UUID.randomUUID();
            byte[] body = multipart(boundary, request, size);
            if (body.length > MAX_REQUEST_BYTES) {
                throw new IllegalArgumentException("AI image request exceeds the byte limit");
            }
            long remainingNanos = deadline - System.nanoTime();
            if (remainingNanos <= 0) {
                throw new TimeoutException("AI image deadline reached before sending");
            }
            observed = Optional.empty();
            HttpResponse<byte[]> response = send(boundary, body, Duration.ofNanos(remainingNanos));
            if (response.statusCode() < 200 || response.statusCode() >= HTTP_REDIRECTION) {
                // A provider rejection is not treated as a known-free call without usage evidence.
                throw new ProviderResponseException(response.statusCode(), errorCode(response.body()),
                        response.headers().firstValue("Retry-After").orElse(""));
            }
            // Images are priced flat: an accepted response settles the configured cost per image.
            observed = Optional.of(maximumCost);
            byte[] png = imageBytes(response.body());
            var verdict = ImageTransparency.inspect(png, request.transparentBackground());
            if (verdict != ImageTransparency.Verdict.USABLE) {
                throw AiImageGenerationException.rejected("AI image rejected: " + verdict);
            }
            telemetry.recordAi(AiOutcome.SUCCESS);
            return new GeneratedImage(png, properties.model());
        } catch (Exception failure) {
            telemetry.recordAi(classifyFailure(failure));
            throw failure;
        } finally {
            admission.complete(permit, observed);
        }
    }

    private byte[] multipart(String boundary, ImageEditRequest request, String size) {
        var out = new ByteArrayOutputStream();
        field(out, boundary, "model", properties.model());
        field(out, boundary, "prompt", request.prompt());
        for (ReferenceImage reference : request.references()) {
            write(out, "--" + boundary + CRLF + "Content-Disposition: form-data; name=\"image[]\"; filename=\""
                    + reference.fileName() + "\"" + CRLF + "Content-Type: image/png" + CRLF + CRLF);
            out.writeBytes(reference.png());
            write(out, CRLF);
        }
        field(out, boundary, "size", size);
        field(out, boundary, "quality", properties.quality());
        if (request.transparentBackground()) {
            field(out, boundary, "background", "transparent");
        }
        field(out, boundary, "output_format", "png");
        field(out, boundary, "n", "1");
        write(out, "--" + boundary + "--" + CRLF);
        return out.toByteArray();
    }

    private static void field(ByteArrayOutputStream out, String boundary, String name, String value) {
        write(out, "--" + boundary + CRLF + "Content-Disposition: form-data; name=\"" + name + "\"" + CRLF
                + "Content-Type: text/plain; charset=UTF-8" + CRLF + CRLF + value + CRLF);
    }

    private static void write(ByteArrayOutputStream out, String text) {
        out.writeBytes(text.getBytes(StandardCharsets.UTF_8));
    }

    private HttpResponse<byte[]> send(String boundary, byte[] body, Duration remaining)
            throws InterruptedException, ExecutionException, TimeoutException {
        HttpRequest request = HttpRequest.newBuilder(editsUri).timeout(remaining)
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(body)).build();
        var response = httpClient.sendAsync(request, HttpResponse.BodyHandlers.limiting(
                HttpResponse.BodyHandlers.ofByteArray(), MAX_RESPONSE_BYTES));
        try {
            // Covers response-body download too, not just connection/response headers.
            return response.get(remaining.toNanos(), TimeUnit.NANOSECONDS);
        } catch (InterruptedException | TimeoutException exception) {
            response.cancel(true);
            throw exception;
        }
    }

    private byte[] imageBytes(byte[] body) throws InvalidProviderContentException {
        try {
            String encoded = objectMapper.readTree(body).path("data").path(0).path("b64_json").asText("");
            if (encoded.isBlank()) {
                throw new InvalidProviderContentException();
            }
            return Base64.getDecoder().decode(encoded);
        } catch (JacksonException | IllegalArgumentException invalid) {
            throw new InvalidProviderContentException();
        }
    }

    private AiOutcome classifyFailure(Exception failure) {
        if (failure instanceof ProviderResponseException response) {
            if (BILLING_ERRORS.contains(response.code)) {
                return AiOutcome.QUOTA_EXHAUSTED;
            }
            return response.status == HTTP_TOO_MANY_REQUESTS ? AiOutcome.RATE_LIMITED : AiOutcome.PROVIDER_FAILURE;
        }
        if (failure instanceof InvalidProviderContentException || failure instanceof AiImageGenerationException) {
            return AiOutcome.INVALID_RESPONSE;
        }
        if (failure instanceof InterruptedException) {
            return AiOutcome.CANCELLED;
        }
        Throwable cause = failure instanceof ExecutionException ? failure.getCause() : failure;
        return cause instanceof TimeoutException || cause instanceof HttpTimeoutException
                ? AiOutcome.TIMEOUT : AiOutcome.PROVIDER_FAILURE;
    }

    private static AiOutcome admissionOutcome(String code) {
        return switch (code) {
            case "AI_BUDGET_EXHAUSTED" -> AiOutcome.BUDGET_EXHAUSTED;
            case "AI_PAID_CALLS_PAUSED" -> AiOutcome.PAUSED;
            case "AI_CAPACITY_EXCEEDED" -> AiOutcome.CAPACITY_EXCEEDED;
            default -> AiOutcome.ADMISSION_FAILURE;
        };
    }

    /** Only explicit 429/5xx responses are replayed; a timeout may already have been processed and billed. */
    private long retryDelay(Exception exception, int completedAttempt) {
        if (!(exception instanceof ProviderResponseException failure)) {
            return -1;
        }
        if (BILLING_ERRORS.contains(failure.code)
                || (failure.status != HTTP_TOO_MANY_REQUESTS
                && (failure.status < 500 || failure.status >= HTTP_STATUS_UPPER_BOUND))) {
            return -1;
        }
        long minimum = serverDelay(failure.retryAfter);
        if (minimum > MAX_BACKOFF_MS) {
            return -1;
        }
        long delay = Math.min(Math.max(0, properties.initialBackoffMs()), MAX_BACKOFF_MS);
        delay = Math.min(delay * (1L << (completedAttempt - 1)), MAX_BACKOFF_MS);
        return Math.max(delay, minimum) + ThreadLocalRandom.current().nextLong(JITTER_MS + 1);
    }

    private static long serverDelay(String header) {
        if (header.isBlank()) {
            return 0;
        }
        String normalized = header.trim();
        if (normalized.matches("[0-9]+")) {
            try {
                return Math.multiplyExact(Long.parseLong(normalized), 1000L);
            } catch (NumberFormatException | ArithmeticException overflow) {
                return Long.MAX_VALUE; // Never retry earlier than an unrepresentably large delay.
            }
        }
        try {
            return Math.max(0, Duration.between(Instant.now(),
                    ZonedDateTime.parse(normalized, DateTimeFormatter.RFC_1123_DATE_TIME).toInstant()).toMillis());
        } catch (RuntimeException invalid) {
            return 0;
        }
    }

    private String errorCode(byte[] body) {
        try {
            return objectMapper.readTree(body).path("error").path("code").asText("");
        } catch (Exception exception) {
            return "";
        }
    }

    private static String describe(Exception failure) {
        return failure instanceof ProviderResponseException response
                ? "HTTP " + response.status : failure.getClass().getSimpleName();
    }

    private static boolean pause(long milliseconds) {
        try {
            Thread.sleep(milliseconds);
            return true;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    private static final class InvalidProviderContentException extends Exception {
    }

    private static final class ProviderResponseException extends Exception {
        private final int status;
        private final String code;
        private final String retryAfter;

        private ProviderResponseException(int status, String code, String retryAfter) {
            super("Provider HTTP status " + status);
            this.status = status;
            this.code = code;
            this.retryAfter = retryAfter;
        }
    }
}
