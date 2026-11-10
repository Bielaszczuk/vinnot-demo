package com.vinnot.user.application.service;

import com.vinnot.user.domain.valueobject.SecurityEventType;
import com.vinnot.notification.application.port.in.ManagePushDevicesUseCase;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.domain.valueobject.Role;
import com.vinnot.user.domain.valueobject.SuspensionReason;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class AutomatedAccountSuspensionServiceTest {

    private final UserRepositoryPort users = mock(UserRepositoryPort.class);
    private final AccountAdministrationNoticeService notices = mock(AccountAdministrationNoticeService.class);
    private final ManagePushDevicesUseCase pushDevices = mock(ManagePushDevicesUseCase.class);
    private final SecurityEventRecorder securityEvents = mock(SecurityEventRecorder.class);
    private final AutomatedAccountSuspensionService service =
            new AutomatedAccountSuspensionService(users, notices, pushDevices, securityEvents);

    @Test
    void locksTheAccountPermanentlyLikeAnAdministrativeSuspension() {
        User user = user();
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        service.suspendForCatalogScraping(user.getId());

        assertThat(user.isLocked()).isTrue();
        assertThat(user.getLockReason())
                .isEqualTo("TERMS_VIOLATION: Automatic suspension: daily catalog quota exceeded");
        verify(users).save(user);
        verify(pushDevices).forgetUser(user.getId());
        verify(notices).suspended(user, SuspensionReason.TERMS_VIOLATION, null);
        verify(securityEvents).record(SecurityEventType.ACCOUNT_AUTO_SUSPENDED, user.getId());
    }

    @Test
    void leavesAnAlreadyLockedAccountUntouched() {
        User user = user();
        user.lock("SPAM");
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        service.suspendForCatalogScraping(user.getId());

        assertThat(user.getLockReason()).isEqualTo("SPAM");
        verify(users, never()).save(any());
        verifyNoInteractions(notices, pushDevices, securityEvents);
    }

    @Test
    void neverLocksAdministratorsOrModerators() {
        for (Role role : new Role[] {Role.ADMIN, Role.MODERATOR}) {
            User user = user();
            user.addRole(role);
            when(users.findById(user.getId())).thenReturn(Optional.of(user));

            service.suspendForCatalogScraping(user.getId());

            assertThat(user.isLocked()).as(role.name()).isFalse();
        }
        verify(users, never()).save(any());
        verifyNoInteractions(notices, pushDevices);
    }

    @Test
    void ignoresAnAccountThatNoLongerExists() {
        UUID missing = UUID.randomUUID();
        when(users.findById(missing)).thenReturn(Optional.empty());

        service.suspendForCatalogScraping(missing);

        verify(users, never()).save(any());
        verifyNoInteractions(notices, pushDevices);
    }

    private User user() {
        return User.create("wine-user", Email.of("user@example.com"), Password.fromHash("hash"), "Wine", "User");
    }
}
