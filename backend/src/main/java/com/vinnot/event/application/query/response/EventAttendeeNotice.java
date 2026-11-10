package com.vinnot.event.application.query.response;

import java.util.UUID;

/** One registration to notify about a change to its event: its account, the language it chose and how it paid. */
public record EventAttendeeNotice(UUID registrationId, UUID userId, String recipient, String language, String paymentStatus,
        boolean externallyManagedPayment) {
}
