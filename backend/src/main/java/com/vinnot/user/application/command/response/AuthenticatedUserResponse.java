package com.vinnot.user.application.command.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AuthenticatedUserResponse(
        UUID id,
        String username,
        String email,
        String name,
        String firstName,
        String lastName,
        String phoneNumber,
        String avatarUrl,
        List<String> roles,
        List<String> permissions,
        boolean enabled,
        boolean locked,
        boolean emailVerified,
        boolean hasSocialIdentity,
        boolean hasPassword,
        boolean onboardingCompleted,
        Instant createdAt,
        Instant updatedAt,
        List<String> socialProviders
) {
}
