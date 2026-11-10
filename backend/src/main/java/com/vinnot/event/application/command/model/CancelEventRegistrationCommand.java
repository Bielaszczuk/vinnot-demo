package com.vinnot.event.application.command.model;

import java.util.UUID;

public record CancelEventRegistrationCommand(
        UUID eventId,
        UUID userId
) {
}

