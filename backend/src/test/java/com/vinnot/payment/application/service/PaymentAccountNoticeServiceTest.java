package com.vinnot.payment.application.service;

import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;
import com.vinnot.payment.application.service.PaymentAccountNoticeService.ReconnectReason;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class PaymentAccountNoticeServiceTest {
    private final NotificationPort notifications = mock(NotificationPort.class);
    private final PushNotificationPort pushes = mock(PushNotificationPort.class);
    private final PaymentAccountNoticeService service = new PaymentAccountNoticeService(notifications, pushes);
    private final UUID owner = UUID.fromString("11111111-2222-3333-4444-555555555555");

    @Test
    void aConnectionEmailsTheOrganizerOncePerAttempt() {
        service.connected(owner, "state-hash");
        verify(notifications).enqueue(NotificationRequest.of(NotificationType.PAYMENT_ACCOUNT_CONNECTED,
                NotificationRecipient.user(owner), NotificationLocale.ES, Map.of(),
                "payment-account-connected:" + owner + ":state-hash"));
        verifyNoInteractions(pushes);
    }

    @Test
    void aReconnectionEmailsAndPushesUnderOneKeyPerConnection() {
        Instant expiry = Instant.parse("2026-10-15T12:00:00Z");
        service.reconnectRequired(owner, ReconnectReason.EXPIRED, expiry);
        String key = "payment-reconnect:" + owner + ":" + expiry.getEpochSecond();
        verify(notifications).enqueue(NotificationRequest.of(NotificationType.PAYMENT_ACCOUNT_RECONNECT_REQUIRED,
                NotificationRecipient.user(owner), NotificationLocale.ES, Map.of("reason", "EXPIRED"), key));
        verify(pushes).push(new PushRequest(NotificationType.PAYMENT_ACCOUNT_RECONNECT_REQUIRED, List.of(owner),
                Map.of("reason", "EXPIRED"), key, true));
    }
}
