package com.vinnot.notification.infrastructure.outbox;

import com.vinnot.notification.application.port.out.PushOutboxPort;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;
import com.vinnot.shared.infrastructure.effects.DurableEffectQueue;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.time.Instant;
import java.util.HashMap;
import java.util.Objects;

/** A push request is one outbox job, however many accounts it reaches. */
@Component
public class OutboxPushAdapter implements PushOutboxPort {
    public static final String KIND = "PUSH_NOTIFICATION";
    public static final String KEY_PREFIX = "push:";
    private final DurableEffectQueue queue;

    public OutboxPushAdapter(DurableEffectQueue queue) {
        this.queue = queue;
    }

    @Override
    public void store(PushRequest request, Duration delay) {
        queue.enqueue(KIND, KEY_PREFIX + request.dedupeKey(), encode(request), delay);
    }

    @Override
    public void storeAll(List<Delayed> requests) {
        queue.enqueueAll(KIND, requests.stream().map(delayed -> new DurableEffectQueue.Job(
                KEY_PREFIX + delayed.request().dedupeKey(), encode(delayed.request()), delayed.delay())).toList());
    }

    static Map<String, Object> encode(PushRequest request) {
        Map<String, Object> payload = new HashMap<>(Map.of("type", request.type().name(),
                "dedupeKey", request.dedupeKey(), "userIds", request.userIds().stream().map(UUID::toString).toList(),
                "data", request.data(), "deferrable", request.deferrable()));
        if (Objects.nonNull(request.expiresAt())) {
            payload.put("expiresAt", request.expiresAt().toString());
        }
        return payload;
    }

    @SuppressWarnings("unchecked")
    static PushRequest decode(Map<String, Object> payload) {
        List<UUID> users = ((List<String>) payload.get("userIds")).stream().map(UUID::fromString).toList();
        return new PushRequest(NotificationType.valueOf((String) payload.get("type")), users,
                (Map<String, String>) payload.get("data"), (String) payload.get("dedupeKey"),
                // Jobs queued before the flag existed are immediate.
                Boolean.TRUE.equals(payload.get("deferrable")),
                payload.get("expiresAt") instanceof String expiry ? Instant.parse(expiry) : null);
    }
}
