package com.vinnot.user.application.query.response;

import com.vinnot.user.domain.model.User;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

public record UserResponse(
        UUID id,
        String username,
        String email,
        String firstName,
        String lastName,
        String phoneNumber,
        String fullName,
        String name,
        String profileImageUrl,
        String avatarUrl,
        Set<String> roles,
        boolean active,
        boolean locked,
        boolean emailVerified,
        boolean hasSocialIdentity,
        boolean hasPassword,
        Set<String> socialProviders,
        boolean onboardingCompleted,
        String preferredLanguage,
        String timezone,
        String lockReason,
        Instant lastLoginAt,
        Instant createdAt,
        Instant updatedAt
) {

    public static UserResponse fromDomain(User user) {
        return fromDomain(user, Set.of());
    }

    public static UserResponse fromDomain(User user, Set<String> socialProviders) {
        Set<String> roleNames = user.getRoles().stream()
                .map(role -> "ROLE_" + role.name())
                .collect(Collectors.toSet());
        String computedName = user.getFullName();
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail().getValue(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhoneNumber(),
                computedName,
                computedName,
                user.getProfileImageUrl(),
                user.getProfileImageUrl(),
                roleNames,
                user.isActive(),
                user.isLocked(),
                user.isEmailVerified(),
                !socialProviders.isEmpty(),
                user.hasPassword(),
                Set.copyOf(socialProviders),
                user.isOnboardingCompleted(),
                user.getPreferredLanguage().getValue(),
                user.getTimezone().getValue(),
                user.getLockReason(),
                user.getLastLoginAt(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
