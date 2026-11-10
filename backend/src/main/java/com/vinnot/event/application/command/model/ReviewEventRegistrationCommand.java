package com.vinnot.event.application.command.model;

import com.vinnot.event.domain.valueobject.EventPaymentMethod;
import com.vinnot.event.domain.valueobject.EventRegistrationAction;

import java.util.UUID;

public record ReviewEventRegistrationCommand(
        UUID eventId,
        UUID registrationId,
        UUID requestingUserId,
        boolean isAdmin,
        EventRegistrationAction action,
        EventPaymentMethod paymentMethod,
        String organizerNote
) {
}
