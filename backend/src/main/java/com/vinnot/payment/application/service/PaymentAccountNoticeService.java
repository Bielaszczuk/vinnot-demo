package com.vinnot.payment.application.service;

import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Tells organizers about their Mercado Pago connection (#309): an email when it is connected, and an email and
 * a push when it must be connected again. The reconnection key names the connection by its credential expiry,
 * so one connection gets one reconnection notice however many renewal runs find it broken; a new connection or
 * a successful renewal starts a new one.
 */
public class PaymentAccountNoticeService {
    /** Why the organizer has to connect again. */
    public enum ReconnectReason { REVOKED, EXPIRED }

    private final NotificationPort notifications;
    private final PushNotificationPort pushes;

    public PaymentAccountNoticeService(NotificationPort notifications, PushNotificationPort pushes) {
        this.notifications = notifications;
        this.pushes = pushes;
    }

    /** One email per completed connection attempt, keyed by that attempt's state digest. */
    public void connected(UUID ownerId, String attempt) {
        enqueue(NotificationType.PAYMENT_ACCOUNT_CONNECTED, ownerId, Map.of(),
                "payment-account-connected:" + ownerId + ":" + attempt);
    }

    /** The connection that expires at {@code expiresAt} can no longer be renewed. */
    public void reconnectRequired(UUID ownerId, ReconnectReason reason, Instant expiresAt) {
        String key = "payment-reconnect:" + ownerId + ":" + expiresAt.getEpochSecond();
        enqueue(NotificationType.PAYMENT_ACCOUNT_RECONNECT_REQUIRED, ownerId, Map.of("reason", reason.name()), key);
        pushes.push(new PushRequest(NotificationType.PAYMENT_ACCOUNT_RECONNECT_REQUIRED, List.of(ownerId),
                Map.of("reason", reason.name()), key, true));
    }

    private void enqueue(NotificationType type, UUID ownerId, Map<String, String> data, String key) {
        // The locale is only a fallback: user recipients are written in their current language.
        notifications.enqueue(NotificationRequest.of(type, NotificationRecipient.user(ownerId), NotificationLocale.ES,
                data, key));
    }
}
