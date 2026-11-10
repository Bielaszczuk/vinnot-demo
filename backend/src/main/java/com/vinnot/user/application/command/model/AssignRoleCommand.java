package com.vinnot.user.application.command.model;

import java.util.UUID;

public record AssignRoleCommand(UUID userId, String role, UUID actorId, boolean replace) {
    public AssignRoleCommand(UUID userId, String role) {
        this(userId, role, null, false);
    }
}
