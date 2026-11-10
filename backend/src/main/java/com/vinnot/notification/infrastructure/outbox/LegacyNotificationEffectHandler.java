package com.vinnot.notification.infrastructure.outbox;

import com.vinnot.notification.application.port.in.DeliverNotificationUseCase;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.effects.ExternalEffectHandler;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Delivers rows that were enqueued with the pre-notification-module kinds before the upgrade, so no
 * email is lost during a deploy. Safe to delete once no such rows remain in {@code external_effects}.
 */
@Component
public class LegacyNotificationEffectHandler implements ExternalEffectHandler {
    static final String SUPPORT_KIND = "SUPPORT_REQUEST";
    static final String SUBMISSION_KIND = "submission-status";
    private final DeliverNotificationUseCase delivery;

    public LegacyNotificationEffectHandler(DeliverNotificationUseCase delivery) {
        this.delivery = delivery;
    }

    @Override
    public boolean supports(String kind) {
        return SUPPORT_KIND.equals(kind) || SUBMISSION_KIND.equals(kind);
    }

    @Override
    public void execute(String kind, Map<String, Object> payload) {
        delivery.deliver(SUBMISSION_KIND.equals(kind) ? submission(payload) : support(payload));
    }

    private static NotificationRequest submission(Map<String, Object> payload) {
        return NotificationRequest.of(NotificationType.WINE_SUBMISSION_STATUS,
                NotificationRecipient.user(UUID.fromString(text(payload, "userId"))), NotificationLocale.ES,
                Map.of("wineName", text(payload, "wineName"), "status", text(payload, "status"),
                        "reason", text(payload, "reason")),
                "legacy:" + SUBMISSION_KIND);
    }

    private static NotificationRequest support(Map<String, Object> payload) {
        return NotificationRequest.of(NotificationType.SUPPORT_REQUEST,
                NotificationRecipient.address(text(payload, "recipient"), null), NotificationLocale.EN,
                Map.of("requestId", text(payload, "requestId"), "name", text(payload, "name"),
                        "email", text(payload, "email"), "subject", text(payload, "subject"),
                        "message", text(payload, "message")),
                "legacy:" + SUPPORT_KIND);
    }

    private static String text(Map<String, Object> payload, String key) {
        return Objects.requireNonNull(payload.get(key), "Legacy notification payload is missing " + key).toString();
    }
}
