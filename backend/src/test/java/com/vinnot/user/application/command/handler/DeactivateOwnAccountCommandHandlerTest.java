package com.vinnot.user.application.command.handler;

import com.vinnot.user.application.command.model.DeactivateOwnAccountCommand;
import com.vinnot.user.application.port.out.RefreshTokenRepositoryPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.domain.valueobject.Role;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import com.vinnot.notification.application.port.in.ManagePushDevicesUseCase;
import com.vinnot.user.application.service.AccountSecurityNoticeService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;

@ExtendWith(MockitoExtension.class)
class DeactivateOwnAccountCommandHandlerTest {
    private final ManagePushDevicesUseCase pushDevices = mock(ManagePushDevicesUseCase.class);

    @Mock
    private UserRepositoryPort userRepository;
    @Mock
    private RefreshTokenRepositoryPort refreshTokenRepository;
    @Mock
    private AccountSecurityNoticeService securityNotices;

    @Test
    void deactivatesAccountAndInvalidatesAllRefreshTokens() {
        User user = User.create(
                "inactive-user", Email.of("inactive@vinnot.com"),
                Password.fromHash("hash"), "Inactive", "User");
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        DeactivateOwnAccountCommandHandler handler =
                new DeactivateOwnAccountCommandHandler(
                        userRepository, refreshTokenRepository, securityNotices, pushDevices);

        handler.execute(new DeactivateOwnAccountCommand(user.getId()));

        assertThat(user.isActive()).isFalse();
        verify(userRepository).save(user);
        verify(pushDevices).forgetUser(user.getId());
        verify(refreshTokenRepository).deleteByUserId(user.getId());
        verify(securityNotices).deactivated(user);
    }

    @Test
    void lastActiveAdministratorCannotDeactivateTheirOwnAccount() {
        User admin = admin();
        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(userRepository.lockActiveAdministratorIds()).thenReturn(List.of(admin.getId()));

        assertThatThrownBy(() -> handler().execute(new DeactivateOwnAccountCommand(admin.getId())))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code").isEqualTo("LAST_ADMIN");
        assertThat(admin.isActive()).isTrue();
        verify(userRepository, never()).save(any());
        verify(refreshTokenRepository, never()).deleteByUserId(any());
    }

    @Test
    void administratorCanDeactivateTheirOwnAccountWhileAnotherAdministratorRemains() {
        User admin = admin();
        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(userRepository.lockActiveAdministratorIds()).thenReturn(List.of(admin.getId(), UUID.randomUUID()));

        handler().execute(new DeactivateOwnAccountCommand(admin.getId()));

        assertThat(admin.isActive()).isFalse();
        verify(userRepository).save(admin);
    }

    private DeactivateOwnAccountCommandHandler handler() {
        return new DeactivateOwnAccountCommandHandler(userRepository, refreshTokenRepository, securityNotices, pushDevices);
    }

    private User admin() {
        User admin = User.create("admin-user", Email.of("admin@vinnot.com"), Password.fromHash("hash"), "Admin", "User");
        admin.addRole(Role.ADMIN);
        return admin;
    }
}
