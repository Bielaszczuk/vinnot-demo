package com.vinnot.notification.application.service;

import com.vinnot.notification.application.port.out.NotificationOutboxPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;

class EnqueueNotificationServiceTest {
    @Test
    void storesTheRequestInTheOutboxInsteadOfDeliveringIt() {
        var outbox = mock(NotificationOutboxPort.class);
        var request = NotificationRequest.of(NotificationType.SUPPORT_REQUEST,
                NotificationRecipient.address("support@example.test", null), NotificationLocale.EN, Map.of(), "support:1");
        new EnqueueNotificationService(outbox).enqueue(request);
        verify(outbox).store(request);
    }

    @Test
    void refusesOptionalNotificationsToAnAddressBecausePreferencesBelongToAnAccount() {
        var outbox = mock(NotificationOutboxPort.class);
        var request = NotificationRequest.of(
                NotificationType.NEWSLETTER,
                NotificationRecipient.address("ana@example.test", "Ana"),
                NotificationLocale.ES, Map.of(), "newsletter:1");

        assertThatThrownBy(() -> new EnqueueNotificationService(outbox).enqueue(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Optional notifications are only sent to users");
        verifyNoInteractions(outbox);
    }
}
