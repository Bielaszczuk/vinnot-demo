package com.vinnot.user.application.command.model;

import java.util.UUID;

public record UpdateUserAdminCommand(UUID userId, String firstName, String lastName, Boolean active, UUID actorId) {
    public UpdateUserAdminCommand(UUID userId, String firstName, String lastName, Boolean active) {
        this(userId, firstName, lastName, active, null);
    }
}
