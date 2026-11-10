package com.vinnot.payment.application.port.in;

import java.net.URI;
import java.util.Optional;
import java.util.UUID;

public interface DispatchTicketCheckoutUseCase {
    /** Empty means creation is already in flight or uncertain; refresh state, never create another attempt. */
    Optional<URI> execute(UUID attemptId, UUID buyerId);
}
