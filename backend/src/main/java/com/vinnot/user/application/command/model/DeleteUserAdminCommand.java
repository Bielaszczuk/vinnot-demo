package com.vinnot.user.application.command.model;

import java.util.UUID;

public record DeleteUserAdminCommand(UUID userId, UUID actorId) {
    public DeleteUserAdminCommand(UUID userId) {
        this(userId, null);
    }
}
