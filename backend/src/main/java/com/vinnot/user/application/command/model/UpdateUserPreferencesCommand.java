package com.vinnot.user.application.command.model;

import java.util.UUID;

/** Stores the user's language and time zone; a null value keeps the stored one. */
public record UpdateUserPreferencesCommand(UUID userId, String preferredLanguage, String timezone) {
}
