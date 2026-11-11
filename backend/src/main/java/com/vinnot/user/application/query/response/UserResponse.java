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
        String bio,
        String cellarVisibility,
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

    /**
     * @param avatarUrl the profile photo URL clients load, or {@code null} without one; both photo fields carry it
     */
    public static UserResponse fromDomain(User user, String avatarUrl) {
        return fromDomain(user, Set.of(), avatarUrl);
    }

    /**
     * @param avatarUrl the profile photo URL clients load, or {@code null} without one; both photo fields carry it
     */
    public static UserResponse fromDomain(User user, Set<String> socialProviders, String avatarUrl) {
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
                avatarUrl,
                avatarUrl,
                user.getBio(),
                user.getCellarVisibility().name(),
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
