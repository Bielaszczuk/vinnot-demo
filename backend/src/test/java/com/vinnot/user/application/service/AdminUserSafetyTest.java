package com.vinnot.user.application.service;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.domain.valueobject.Role;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class AdminUserSafetyTest {
    @Test
    void protectsSelfAndLastAdministratorButAllowsManagingOthers() {
        var users = mock(UserRepositoryPort.class);
        User target = User.create("admin", Email.of("admin@example.com"), Password.fromHash("hash"), "Admin", "User");
        UUID actor = UUID.randomUUID();
        assertThatCode(() -> AdminUserSafety.requireCanRemoveAccess(users, actor, target)).doesNotThrowAnyException();
        verifyNoInteractions(users);
        target.addRole(Role.ADMIN);
        assertThatThrownBy(() -> AdminUserSafety.requireCanRemoveAccess(users, target.getId(), target))
                .isInstanceOf(BusinessRuleViolationException.class).extracting("code").isEqualTo("ADMIN_SELF_CHANGE");
        when(users.lockActiveAdministratorIds()).thenReturn(List.of(target.getId()));
        assertThatThrownBy(() -> AdminUserSafety.requireCanRemoveAccess(users, actor, target))
                .isInstanceOf(BusinessRuleViolationException.class).extracting("code").isEqualTo("LAST_ADMIN");
        when(users.lockActiveAdministratorIds()).thenReturn(List.of(target.getId(), actor));
        assertThatCode(() -> AdminUserSafety.requireCanRemoveAccess(users, actor, target)).doesNotThrowAnyException();
    }
}
