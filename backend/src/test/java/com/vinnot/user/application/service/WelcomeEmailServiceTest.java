package com.vinnot.user.application.service;

import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class WelcomeEmailServiceTest {
    private final NotificationPort notifications = mock(NotificationPort.class);

    @Test
    void queuesOneTransactionalWelcomeForTheUserKeyedByTheirId() {
        User user = User.create("ana", Email.of("ana@vinnot.com"), Password.fromHash("hash"), "Ana", "Paz");

        new WelcomeEmailService(notifications).welcome(user);

        var request = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications).enqueue(request.capture());
        assertThat(request.getValue().type()).isEqualTo(NotificationType.ACCOUNT_WELCOME);
        assertThat(request.getValue().recipient().userId()).isEqualTo(user.getId());
        assertThat(request.getValue().dedupeKey()).isEqualTo("welcome:" + user.getId());
        assertThat(request.getValue().locale()).isEqualTo(AccountActionTokenService.localeOf(user));
        assertThat(request.getValue().category()).isEqualTo(NotificationCategory.ACCOUNT);
        assertThat(request.getValue().category().transactional()).isTrue();
        assertThat(request.getValue().data()).isEmpty();
        assertThat(NotificationLocale.values()).contains(request.getValue().locale());
    }
}
