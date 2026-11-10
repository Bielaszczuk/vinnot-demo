package com.vinnot.event.application.command.model;

import java.util.UUID;

public record PublishEventCommand(
        UUID eventId,
        UUID requestingUserId,
        boolean administrator
) {
}
