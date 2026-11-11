package com.vinnot.user.application.command.model;

import java.util.UUID;

/**
 * Changes to the signed-in member's profile; a {@code null} field keeps the stored value.
 *
 * @param bio              the public bio (#541); blank clears it
 * @param cellarVisibility PUBLIC, FOLLOWERS or PRIVATE (#541)
 */
public record UpdateUserProfileCommand(
        UUID userId,
        String username,
        String firstName,
        String lastName,
        String legacyName,
        String phoneNumber,
        String bio,
        String cellarVisibility
) {
    public UpdateUserProfileCommand(UUID userId, String username, String firstName, String lastName, String legacyName,
            String phoneNumber) {
        this(userId, username, firstName, lastName, legacyName, phoneNumber, null, null);
    }

    public UpdateUserProfileCommand(UUID userId, String username, String firstName, String lastName, String legacyName) {
        this(userId, username, firstName, lastName, legacyName, null);
    }
}
