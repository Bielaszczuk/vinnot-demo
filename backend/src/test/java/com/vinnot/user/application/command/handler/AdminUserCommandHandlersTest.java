package com.vinnot.user.application.command.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.user.application.command.model.AssignRoleCommand;
import com.vinnot.user.application.command.model.BanUserCommand;
import com.vinnot.user.application.command.model.DeleteUserAdminCommand;
import com.vinnot.user.application.command.model.UnbanUserCommand;
import com.vinnot.user.application.command.model.UpdateUserAdminCommand;
import com.vinnot.user.application.port.out.PermissionRepositoryPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.domain.valueobject.Role;
import com.vinnot.user.domain.valueobject.SuspensionReason;
import com.vinnot.user.application.service.AccountAdministrationNoticeService;
import com.vinnot.user.application.service.SecurityEventRecorder;
import com.vinnot.user.domain.valueobject.SecurityEventType;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import com.vinnot.notification.application.port.in.ManagePushDevicesUseCase;
import com.vinnot.shared.domain.exception.DomainException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;

class AdminUserCommandHandlersTest {
    private final AccountAdministrationNoticeService notices = mock(AccountAdministrationNoticeService.class);
    private final ManagePushDevicesUseCase pushDevices = mock(ManagePushDevicesUseCase.class);
    private final SecurityEventRecorder securityEvents = mock(SecurityEventRecorder.class);


    @Test
    void assignsRolesAndPersistsTheAggregate() {
        UserRepositoryPort users = mock(UserRepositoryPort.class);
        User user = user();
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        new AssignRoleCommandHandler(users, notices, securityEvents).execute(
                new AssignRoleCommand(user.getId(), "admin"));

        assertThat(user.getRoles()).contains(Role.ADMIN);
        verify(users).save(user);
        verify(securityEvents).record(SecurityEventType.ROLE_CHANGED, user.getId());
    }

    @Test
    void managesAdministrativeBanAndProfileLifecycle() {
        UserRepositoryPort users = mock(UserRepositoryPort.class);
        User user = user();
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        new BanUserCommandHandler(users, notices, pushDevices, securityEvents).execute(
                new BanUserCommand(user.getId(), null));
        assertThat(user.isLocked()).isTrue();
        assertThat(user.getLockReason()).isEqualTo("OTHER");
        verify(notices).suspended(user, SuspensionReason.OTHER, null);
        verify(pushDevices).forgetUser(user.getId());
        verify(securityEvents).record(SecurityEventType.ACCOUNT_BANNED, user.getId());

        new UnbanUserCommandHandler(users, notices, securityEvents).execute(
                new UnbanUserCommand(user.getId()));
        assertThat(user.isLocked()).isFalse();
        verify(notices).reinstated(eq(user), any());
        new UnbanUserCommandHandler(users, notices, securityEvents).execute(new UnbanUserCommand(user.getId()));
        verify(notices, times(1)).reinstated(eq(user), any());
        verify(securityEvents, times(1)).record(SecurityEventType.ACCOUNT_UNBANNED, user.getId());

        new UpdateUserAdminCommandHandler(users, mock(ManagePushDevicesUseCase.class)).execute(
                new UpdateUserAdminCommand(user.getId(), "Updated", null, false));
        assertThat(user.getFirstName()).isEqualTo("Updated");
        assertThat(user.getLastName()).isEqualTo("User");
        assertThat(user.isActive()).isFalse();

        new UpdateUserAdminCommandHandler(users, mock(ManagePushDevicesUseCase.class)).execute(
                new UpdateUserAdminCommand(user.getId(), null, "Active", true));
        assertThat(user.getLastName()).isEqualTo("Active");
        assertThat(user.isActive()).isTrue();
    }

    @Test
    void deletesExistingUsersAndRejectsUnknownAdministrativeTargets() {
        UserRepositoryPort users = mock(UserRepositoryPort.class);
        User target = user();
        UUID userId = target.getId();
        when(users.findById(userId)).thenReturn(Optional.of(target));
        DeleteUserAdminCommandHandler handler = new DeleteUserAdminCommandHandler(users, notices, securityEvents);

        handler.execute(new DeleteUserAdminCommand(userId));
        var order = inOrder(notices, users);
        order.verify(notices).deletedByAdministrator(target);
        order.verify(users).deleteById(userId);
        verify(securityEvents).record(SecurityEventType.ACCOUNT_DELETED, userId);

        UUID missing = UUID.randomUUID();
        when(users.findById(missing)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> handler.execute(new DeleteUserAdminCommand(missing)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void rejectsMissingUsersAcrossAggregateMutations() {
        UserRepositoryPort users = mock(UserRepositoryPort.class);
        UUID missing = UUID.randomUUID();
        when(users.findById(missing)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> new AssignRoleCommandHandler(users, notices, securityEvents)
                .execute(new AssignRoleCommand(missing, "ADMIN")))
                .isInstanceOf(EntityNotFoundException.class);
        assertThatThrownBy(() -> new BanUserCommandHandler(users, notices, pushDevices, securityEvents)
                .execute(new BanUserCommand(missing, "abuse")))
                .isInstanceOf(EntityNotFoundException.class);
        assertThatThrownBy(() -> new UnbanUserCommandHandler(users, notices, securityEvents)
                .execute(new UnbanUserCommand(missing)))
                .isInstanceOf(EntityNotFoundException.class);
        assertThatThrownBy(() -> new UpdateUserAdminCommandHandler(users, mock(ManagePushDevicesUseCase.class))
                .execute(new UpdateUserAdminCommand(missing, null, null, null)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void theAccountHolderIsToldTheRoleTheSuspensionReasonAndOnlyRealChanges() {
        UserRepositoryPort users = mock(UserRepositoryPort.class);
        User user = user();
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        new AssignRoleCommandHandler(users, notices, securityEvents).execute(new AssignRoleCommand(user.getId(), "moderator"));
        verify(notices).roleChanged(user, Role.MODERATOR);
        new AssignRoleCommandHandler(users, notices, securityEvents).execute(new AssignRoleCommand(user.getId(), "MODERATOR"));
        verify(notices, times(1)).roleChanged(eq(user), any());
        verify(securityEvents, times(1)).record(SecurityEventType.ROLE_CHANGED, user.getId());

        new BanUserCommandHandler(users, notices, pushDevices, securityEvents).execute(
                new BanUserCommand(user.getId(), SuspensionReason.SPAM, " Repeated ads ", UUID.randomUUID()));
        assertThat(user.getLockReason()).isEqualTo("SPAM: Repeated ads");
        verify(notices).suspended(user, SuspensionReason.SPAM, "Repeated ads");

        new BanUserCommandHandler(users, notices, pushDevices, securityEvents).execute(new BanUserCommand(user.getId(), "Legacy free text"));
        verify(notices).suspended(user, SuspensionReason.OTHER, null);
    }

    @Test
    void loadsFlatPermissionCodesThroughItsPort() {
        PermissionRepositoryPort permissions = mock(PermissionRepositoryPort.class);
        UUID userId = UUID.randomUUID();
        when(permissions.findPermissionCodesByUserId(userId))
                .thenReturn(Set.of("wine:read", "wine:write"));

        assertThat(new LoadUserPermissionsHandler(permissions).execute(userId))
                .containsExactlyInAnyOrder("wine:read", "wine:write");
    }

    @Test
    void replacementRetainsUserAndRemovesPreviousFunctionalRoles() {
        UserRepositoryPort users = mock(UserRepositoryPort.class);
        User target = user();
        target.addRole(Role.MODERATOR);
        when(users.findById(target.getId())).thenReturn(Optional.of(target));
        new AssignRoleCommandHandler(users, notices, securityEvents).execute(new AssignRoleCommand(target.getId(), "ROLE_PARTNER", UUID.randomUUID(), true));
        assertThat(target.getRoles()).containsExactlyInAnyOrder(Role.USER, Role.PARTNER);
    }

    @Test
    void selfAndLastAdministratorCannotLoseAccess() {
        UserRepositoryPort users = mock(UserRepositoryPort.class);
        User target = user();
        target.addRole(Role.ADMIN);
        when(users.findById(target.getId())).thenReturn(Optional.of(target));
        when(users.lockActiveAdministratorIds()).thenReturn(List.of(target.getId()));
        assertThatThrownBy(() -> new BanUserCommandHandler(users, notices, pushDevices, securityEvents).execute(
                new BanUserCommand(target.getId(), "reason", target.getId())))
                .hasMessageContaining("own");
        assertThatThrownBy(() -> new AssignRoleCommandHandler(users, notices, securityEvents).execute(
                new AssignRoleCommand(target.getId(), "PARTNER", UUID.randomUUID(), true)))
                .hasMessageContaining("administrator");
        assertThatThrownBy(() -> new UpdateUserAdminCommandHandler(users, mock(ManagePushDevicesUseCase.class)).execute(
                new UpdateUserAdminCommand(target.getId(), null, null, false, UUID.randomUUID())))
                .hasMessageContaining("administrator");
        assertThatThrownBy(() -> new DeleteUserAdminCommandHandler(users, notices, securityEvents).execute(
                new DeleteUserAdminCommand(target.getId(), UUID.randomUUID())))
                .hasMessageContaining("administrator");
        verify(users, never()).save(any());
    }

    @Test
    void administratorCannotLoseOwnAccessThroughEitherRoleEndpoint() {
        UserRepositoryPort users = mock(UserRepositoryPort.class);
        User self = user();
        self.addRole(Role.ADMIN);
        when(users.findById(self.getId())).thenReturn(Optional.of(self));
        when(users.lockActiveAdministratorIds()).thenReturn(List.of(self.getId(), UUID.randomUUID()));
        var handler = new AssignRoleCommandHandler(users, notices, securityEvents);

        assertThatThrownBy(() -> handler.execute(new AssignRoleCommand(self.getId(), "PARTNER", self.getId(), true)))
                .hasMessageContaining("own");
        assertThat(self.hasRole(Role.ADMIN)).isTrue();

        handler.execute(new AssignRoleCommand(self.getId(), "PARTNER", self.getId(), false));
        assertThat(self.hasRole(Role.ADMIN)).isTrue();
        assertThat(self.hasRole(Role.PARTNER)).isTrue();
        verify(users).save(self);
    }

    @Test
    void demotesAdministratorWhenAnotherActiveAdministratorRemainsAndRejectsUnknownRoles() {
        UserRepositoryPort users = mock(UserRepositoryPort.class);
        User target = user();
        target.addRole(Role.ADMIN);
        UUID actor = UUID.randomUUID();
        when(users.findById(target.getId())).thenReturn(Optional.of(target));
        when(users.lockActiveAdministratorIds()).thenReturn(List.of(target.getId(), actor));
        var handler = new AssignRoleCommandHandler(users, notices, securityEvents);
        handler.execute(new AssignRoleCommand(target.getId(), "USER", actor, true));
        assertThat(target.getRoles()).containsExactly(Role.USER);
        assertThatThrownBy(() -> handler.execute(new AssignRoleCommand(target.getId(), "OWNER")))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("INVALID_ROLE");
        assertThatThrownBy(() -> handler.execute(new AssignRoleCommand(target.getId(), null)))
                .isInstanceOf(DomainException.class);
    }

    private User user() {
        return User.create(
                "wine-user",
                Email.of("user@example.com"),
                Password.fromHash("hash"),
                "Wine",
                "User");
    }
}
