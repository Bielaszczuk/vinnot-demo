package com.vinnot.payment.application.port.in;

import java.util.UUID;

public interface PrepareEventCheckoutUseCase {
    /** Amount, seller and deadlines come exclusively from server-side records. */
    default UUID prepare(UUID eventId, UUID registrationId, UUID buyerId) {
        return prepare(eventId, registrationId, buyerId, false);
    }
    UUID prepare(UUID eventId, UUID registrationId, UUID buyerId, boolean returnToApp);
}
