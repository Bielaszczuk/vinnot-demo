package com.vinnot.notification.infrastructure.outbox;

import com.vinnot.notification.application.port.in.DeliverNotificationUseCase;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.shared.infrastructure.effects.ExternalEffectHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Delivers one stored notification. When its last attempt fails, delivery is told it gave up (#490) before the failure
 * propagates, so the job still backs off and stays for an operator exactly as before.
 */
@Component
public class NotificationEffectHandler implements ExternalEffectHandler {
    private static final Logger LOGGER = LoggerFactory.getLogger(NotificationEffectHandler.class);
    private final NotificationPayloadCodec codec;
    private final DeliverNotificationUseCase delivery;
    private final OutboxAttempts attempts;

    public NotificationEffectHandler(NotificationPayloadCodec codec, DeliverNotificationUseCase delivery,
            OutboxAttempts attempts) {
        this.codec = codec;
        this.delivery = delivery;
        this.attempts = attempts;
    }

    @Override
    public boolean supports(String kind) {
        return OutboxNotificationAdapter.KIND.equals(kind);
    }

    @Override
    public void execute(String kind, Map<String, Object> payload) {
        NotificationRequest request = codec.decode(payload);
        try {
            delivery.deliver(request);
        } catch (RuntimeException failure) {
            reportGiveUp(request);
            throw failure;
        }
    }

    /** Never replaces the delivery failure: a problem here is only logged. */
    private void reportGiveUp(NotificationRequest request) {
        try {
            if (attempts.lastAttempt(OutboxNotificationAdapter.KEY_PREFIX + request.dedupeKey())) {
                delivery.gaveUp(request);
            }
        } catch (RuntimeException failure) {
            LOGGER.warn("Could not report a notification the outbox gave up on", failure);
        }
    }
}
