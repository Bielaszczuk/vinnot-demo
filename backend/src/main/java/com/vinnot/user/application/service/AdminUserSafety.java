package com.vinnot.user.application.service;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Role;
import java.util.Objects;
import java.util.UUID;

/** Invariants shared by destructive account administration use cases. */
public final class AdminUserSafety {
    private AdminUserSafety() {
    }

    public static void requireCanRemoveAccess(UserRepositoryPort users, UUID actorId, User target) {
        if (Objects.equals(actorId, target.getId())) {
            throw new BusinessRuleViolationException("ADMIN_SELF_CHANGE", "You cannot remove your own administrative access");
        }
        requireAnotherActiveAdministrator(users, target);
    }

    /** Applies to self-service removal too: the last active administrator cannot leave the platform unmanaged. */
    public static void requireAnotherActiveAdministrator(UserRepositoryPort users, User target) {
        if (target.hasRole(Role.ADMIN)
                && users.lockActiveAdministratorIds().stream().noneMatch(id -> !id.equals(target.getId()))) {
            throw new BusinessRuleViolationException("LAST_ADMIN", "At least one active, unlocked administrator must remain");
        }
    }
}
