package com.vinnot.user.application.query.response;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

public record PublicUserProfileResponse(
        UUID id,
        String username,
        String fullName,
        String avatarUrl,
        Set<String> roles,
        Instant createdAt
) {
    public static PublicUserProfileResponse from(UserResponse user) {
        return new PublicUserProfileResponse(
                user.id(),
                user.username(),
                user.fullName(),
                user.avatarUrl(),
                user.roles(),
                user.createdAt());
    }
}
