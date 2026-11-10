package com.vinnot.payment.application.port.out;

import com.vinnot.payment.domain.model.SellerCredentials;
import java.util.Optional;
import java.util.UUID;

/** Server-side payment orchestration only; credentials must never enter a response or log. */
public interface SellerCredentialReader {
    Optional<SellerCredentials> findCredentials(UUID organizerId);
}
