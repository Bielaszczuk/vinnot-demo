package com.vinnot.admin.application.query.response;

import com.vinnot.admin.application.port.out.UserPointsPort;
import com.vinnot.admin.application.port.out.UserQueryPort;

import java.time.Instant;
import java.util.UUID;

public record UserAdminResponse(
        UUID id,
        String username,
        String email,
        String firstName,
        String lastName,
        String role,
        boolean active,
        boolean locked,
        String lockReason,
        boolean emailVerified,
        Instant lastLoginAt,
        Instant createdAt,
        Instant updatedAt,
        int points,
        String badgeTier
) {

    /**
     * Creates a UserAdminResponse from a UserAdminData projection.
     *
     * @param data     the projected user data from the query port
     * @param standing the member's points and seal (#455)
     * @return the admin response DTO
     */
    public static UserAdminResponse fromData(UserQueryPort.UserAdminData data, UserPointsPort.Standing standing) {
        return new UserAdminResponse(
                data.id(),
                data.username(),
                data.email(),
                data.firstName(),
                data.lastName(),
                data.roles(),
                data.active(),
                data.locked(),
                data.lockReason(),
                data.emailVerified(),
                data.lastLoginAt(),
                data.createdAt(),
                data.updatedAt(),
                standing.points(),
                standing.badgeTier()
        );
    }
}

