package com.vinnot.activity.application.command.model;

import java.util.Objects;
import java.util.UUID;

/** The user opened the app, or a push that opened it. */
public record RecordAppOpenCommand(UUID userId) {
    public RecordAppOpenCommand {
        Objects.requireNonNull(userId, "User cannot be null");
    }
}
