package com.vinnot.event.application.query.model;

import java.util.UUID;

public record GetMyEventRegistrationQuery(
        UUID eventId,
        UUID userId
) {
}
