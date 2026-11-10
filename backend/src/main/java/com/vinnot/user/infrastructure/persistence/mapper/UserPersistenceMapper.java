package com.vinnot.user.infrastructure.persistence.mapper;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.domain.valueobject.PreferredLanguage;
import com.vinnot.user.domain.valueobject.Role;
import com.vinnot.user.domain.valueobject.UserTimezone;
import com.vinnot.user.infrastructure.persistence.entity.UserJpaEntity;

import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

public final class UserPersistenceMapper {

    private UserPersistenceMapper() {
    }

    public static User toDomain(UserJpaEntity entity) {
        Set<Role> roles = entity.getRoles().stream()
                .map(r -> {
                    String roleName = r.getName().replace("ROLE_", "");
                    try {
                        return Role.valueOf(roleName);
                    } catch (IllegalArgumentException e) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        return User.builder()
                .id(entity.getId())
                .revision(entity.getRevision())
                .sessionVersion(entity.getSessionVersion())
                .username(entity.getUsername())
                .email(Email.of(entity.getEmail()))
                .password(Password.fromHash(entity.getPassword()))
                .passwordSet(entity.isPasswordSet())
                .firstName(entity.getFirstName())
                .lastName(entity.getLastName())
                .phoneNumber(entity.getPhoneNumber())
                .profileImageUrl(entity.getProfileImageUrl())
                .roles(roles)
                .active(entity.isActive())
                .locked(entity.isLocked())
                .emailVerified(entity.isEmailVerified())
                .onboardingCompleted(entity.isOnboardingCompleted())
                .preferredLanguage(PreferredLanguage.of(entity.getPreferredLanguage()))
                .timezone(storedTimezone(entity.getTimezone()))
                .lockReason(entity.getLockReason())
                .lastLoginAt(entity.getLastLoginAt())
                .failedLoginAttempts(entity.getFailedLoginAttempts())
                .loginLockedUntil(entity.getLoginLockedUntil())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    /**
     * A zone dropped from a future tz database release must not make the account unloadable,
     * so an unrecognised stored value falls back to the default instead of failing login.
     */
    private static UserTimezone storedTimezone(String value) {
        try {
            return UserTimezone.of(value);
        } catch (DomainException unknownZone) {
            return UserTimezone.DEFAULT;
        }
    }

    public static UserJpaEntity toEntity(User user) {
        UserJpaEntity entity = new UserJpaEntity();
        entity.setId(user.getId());
        entity.setRevision(user.getRevision());
        entity.setSessionVersion(user.getSessionVersion());
        entity.setUsername(user.getUsername());
        entity.setEmail(user.getEmail().getValue());
        entity.setPassword(user.getPassword().getHashedValue());
        entity.setPasswordSet(user.hasPassword());
        entity.setFirstName(user.getFirstName());
        entity.setLastName(user.getLastName());
        entity.setPhoneNumber(user.getPhoneNumber());
        entity.setProfileImageUrl(user.getProfileImageUrl());
        entity.setRoles(new HashSet<>());
        entity.setActive(user.isActive());
        entity.setLocked(user.isLocked());
        entity.setEmailVerified(user.isEmailVerified());
        entity.setOnboardingCompleted(user.isOnboardingCompleted());
        entity.setPreferredLanguage(user.getPreferredLanguage().getValue());
        entity.setTimezone(user.getTimezone().getValue());
        entity.setLockReason(user.getLockReason());
        entity.setLastLoginAt(user.getLastLoginAt());
        // Not written by JPA (insertable/updatable false); kept so the returned aggregate reads the same values.
        entity.setFailedLoginAttempts(user.getFailedLoginAttempts());
        entity.setLoginLockedUntil(user.getLoginLockedUntil());
        entity.setCreatedAt(user.getCreatedAt());
        entity.setUpdatedAt(user.getUpdatedAt());
        return entity;
    }
}
