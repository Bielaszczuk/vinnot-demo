package com.vinnot.user.application.service;

import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.user.domain.model.SocialIdentity;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.domain.valueobject.SocialProvider;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class AccountSecurityNoticeServiceTest {
    private final NotificationPort notifications = mock(NotificationPort.class);
    private final AccountSecurityNoticeService service = new AccountSecurityNoticeService(notifications);
    private final User user = User.create("ana", Email.of("ana@vinnot.com"), Password.fromHash("hash"), "Ana", "Paz");

    @Test
    void aPasswordChangeIsReportedToTheUserOncePerChange() {
        user.changePassword(Password.fromHash("new"));
        service.passwordChanged(user);

        var request = sent();
        assertThat(request.type()).isEqualTo(NotificationType.ACCOUNT_PASSWORD_CHANGED);
        assertThat(request.recipient().userId()).isEqualTo(user.getId());
        assertThat(request.dedupeKey()).isEqualTo("password-changed:" + user.getId() + ":" + user.getSessionVersion());
        assertThat(request.category().transactional()).as("cannot be disabled in preferences").isTrue();
    }

    @Test
    void aTemporarySignInLockIsReportedToTheUserOncePerLock() {
        Instant until = Instant.parse("2026-10-29T12:15:00Z");
        service.loginLocked(user, until);

        var request = sent();
        assertThat(request.type()).isEqualTo(NotificationType.ACCOUNT_LOGIN_LOCKED);
        assertThat(request.recipient().userId()).isEqualTo(user.getId());
        assertThat(request.dedupeKey()).isEqualTo("login-locked:" + user.getId() + ":" + until.toEpochMilli());
        assertThat(request.category().transactional()).as("cannot be disabled in preferences").isTrue();
    }

    @Test
    void aLinkedProviderNamesTheProviderAndTheLink() {
        var identity = SocialIdentity.create(user.getId(), SocialProvider.GOOGLE, "subject", "ana@vinnot.com");
        service.socialLinked(user, identity);

        var request = sent();
        assertThat(request.type()).isEqualTo(NotificationType.ACCOUNT_SOCIAL_LINKED);
        assertThat(request.data()).isEqualTo(Map.of(NotificationType.PROVIDER, "GOOGLE"));
        assertThat(request.dedupeKey()).isEqualTo("social-linked:" + identity.id());
    }

    @Test
    void closingTheAccountWritesToTheAddressCapturedNow() {
        user.deactivate();
        service.deactivated(user);
        var deactivated = sent();
        assertThat(deactivated.type()).isEqualTo(NotificationType.ACCOUNT_DEACTIVATED);
        assertThat(deactivated.recipient().isAddress()).isTrue();
        assertThat(deactivated.recipient().email()).isEqualTo("ana@vinnot.com");
        assertThat(deactivated.recipient().displayName()).isEqualTo(user.getFullName());
        assertThat(deactivated.dedupeKey()).isEqualTo("account-deactivated:" + user.getId() + ":" + user.getSessionVersion());
    }

    @Test
    void aDeletionIsConfirmedToTheAddressBeforeItDisappears() {
        service.deleted(user);
        var deleted = sent();
        assertThat(deleted.type()).isEqualTo(NotificationType.ACCOUNT_DELETED);
        assertThat(deleted.recipient().email()).isEqualTo("ana@vinnot.com");
        assertThat(deleted.dedupeKey()).isEqualTo("account-deleted:" + user.getId());
        assertThat(deleted.category().transactional()).isTrue();
    }

    private NotificationRequest sent() {
        var request = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications).enqueue(request.capture());
        return request.getValue();
    }
}
