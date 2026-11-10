package com.vinnot.user.application.command.model;

import java.util.UUID;

public record UpdateUserProfileCommand(
        UUID userId,
        String username,
        String firstName,
        String lastName,
        String legacyName,
        String phoneNumber
) {
    public UpdateUserProfileCommand(UUID userId, String username, String firstName, String lastName, String legacyName) {
        this(userId, username, firstName, lastName, legacyName, null);
    }
}
