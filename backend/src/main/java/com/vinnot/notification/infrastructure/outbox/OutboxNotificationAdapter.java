package com.vinnot.notification.infrastructure.outbox;

import com.vinnot.notification.application.port.out.NotificationOutboxPort;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.shared.infrastructure.effects.DurableEffectQueue;
import org.springframework.stereotype.Component;

import java.time.Duration;

/** Every notification travels through the shared {@code external_effects} outbox. */
@Component
public class OutboxNotificationAdapter implements NotificationOutboxPort {
    public static final String KIND = "NOTIFICATION";
    /** Keeps notification keys apart from keys written by other effects (for example database triggers). */
    public static final String KEY_PREFIX = "notification:";
    private final DurableEffectQueue queue;
    private final NotificationPayloadCodec codec;

    public OutboxNotificationAdapter(DurableEffectQueue queue, NotificationPayloadCodec codec) {
        this.queue = queue;
        this.codec = codec;
    }

    @Override
    public void store(NotificationRequest request) {
        queue.enqueue(KIND, KEY_PREFIX + request.dedupeKey(), codec.encode(request), Duration.ZERO);
    }
}
