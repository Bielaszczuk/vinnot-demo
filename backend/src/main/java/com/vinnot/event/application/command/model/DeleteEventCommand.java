package com.vinnot.event.application.command.model;

import java.util.UUID;

public record DeleteEventCommand(
        UUID eventId,
        UUID requestingUserId,
        boolean isAdmin
) {
}

