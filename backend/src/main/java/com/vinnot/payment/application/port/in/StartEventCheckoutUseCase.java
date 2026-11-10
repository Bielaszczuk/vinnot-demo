package com.vinnot.payment.application.port.in;

import java.net.URI;
import java.util.UUID;

public interface StartEventCheckoutUseCase {
    record Result(UUID attemptId, URI checkoutUrl) { }
    default Result start(UUID eventId, UUID registrationId, UUID buyerId) {
        return start(eventId, registrationId, buyerId, false);
    }
    Result start(UUID eventId, UUID registrationId, UUID buyerId, boolean returnToApp);
}
