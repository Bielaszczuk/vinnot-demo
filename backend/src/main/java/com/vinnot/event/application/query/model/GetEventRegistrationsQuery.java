package com.vinnot.event.application.query.model;

import com.vinnot.event.domain.valueobject.EventRegistrationStatus;

import java.util.UUID;

public record GetEventRegistrationsQuery(
        UUID eventId,
        UUID requestingUserId,
        boolean isAdmin,
        EventRegistrationStatus status,
        int page,
        int size
) {
}
