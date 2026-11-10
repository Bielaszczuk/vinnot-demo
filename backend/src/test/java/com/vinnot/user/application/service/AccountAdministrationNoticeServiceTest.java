package com.vinnot.user.application.service;

import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.domain.valueobject.Role;
import com.vinnot.user.domain.valueobject.SuspensionReason;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class AccountAdministrationNoticeServiceTest {
    private final NotificationPort notifications = mock(NotificationPort.class);
    private final AccountAdministrationNoticeService service = new AccountAdministrationNoticeService(notifications);
    private final User user = User.create("ana", Email.of("ana@vinnot.com"), Password.fromHash("hash"), "Ana", "Paz");

    @Test
    void aRoleChangeNamesTheRoleOncePerChange() {
        user.addRole(Role.PARTNER);
        service.roleChanged(user, Role.PARTNER);

        NotificationRequest request = sent();
        assertThat(request.type()).isEqualTo(NotificationType.ACCOUNT_ROLE_CHANGED);
        assertThat(request.recipient().userId()).isEqualTo(user.getId());
        assertThat(request.data()).isEqualTo(Map.of("role", "PARTNER"));
        assertThat(request.dedupeKey()).isEqualTo("role-changed:" + user.getId() + ":" + user.getSessionVersion());
        assertThat(request.category().transactional()).isTrue();
    }

    @Test
    void aSuspensionGoesToTheCapturedAddressWithItsReasonAndADetailOnlyForOther() {
        user.lock("SPAM");
        service.suspended(user, SuspensionReason.SPAM, "ignored");
        NotificationRequest spam = sent();
        assertThat(spam.type()).isEqualTo(NotificationType.ACCOUNT_SUSPENDED);
        assertThat(spam.recipient().email()).isEqualTo("ana@vinnot.com");
        assertThat(spam.data()).isEqualTo(Map.of("reasonCode", "SPAM"));

        clearInvocations(notifications);
        service.suspended(user, SuspensionReason.OTHER, " Shared private data ");
        assertThat(sent().data()).isEqualTo(Map.of("reasonCode", "OTHER", "note", "Shared private data"));
    }

    @Test
    void reinstatementAndDeletionAreReported() {
        Instant at = Instant.parse("2026-10-20T18:00:00Z");
        service.reinstated(user, at);
        NotificationRequest reinstated = sent();
        assertThat(reinstated.type()).isEqualTo(NotificationType.ACCOUNT_REINSTATED);
        assertThat(reinstated.dedupeKey()).isEqualTo("account-reinstated:" + user.getId() + ":" + at.toEpochMilli());

        clearInvocations(notifications);
        service.deletedByAdministrator(user);
        NotificationRequest deleted = sent();
        assertThat(deleted.type()).isEqualTo(NotificationType.ACCOUNT_DELETED_BY_ADMIN);
        assertThat(deleted.recipient().email()).isEqualTo("ana@vinnot.com");
        assertThat(deleted.dedupeKey()).isEqualTo("account-deleted-by-admin:" + user.getId());
    }

    private NotificationRequest sent() {
        var captor = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications).enqueue(captor.capture());
        return captor.getValue();
    }
}
