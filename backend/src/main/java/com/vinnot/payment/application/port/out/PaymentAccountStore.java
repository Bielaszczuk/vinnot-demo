package com.vinnot.payment.application.port.out;

import com.vinnot.payment.domain.model.SellerCredentials;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PaymentAccountStore {
    default void begin(UUID ownerId, String stateHash, String verifier, Instant expiresAt) {
        begin(ownerId, stateHash, verifier, expiresAt, false);
    }
    void begin(UUID ownerId, String stateHash, String verifier, Instant expiresAt, boolean returnToApp);
    /** Only a high-entropy, unexpired state created by an authenticated organizer can resolve an owner. */
    Optional<ConnectionAttempt> findPending(String stateHash, Instant now);
    record ConnectionAttempt(UUID ownerId, boolean returnToApp) { }
    /** Atomically consumes an unexpired attempt belonging to this authenticated owner. */
    Optional<String> consume(UUID ownerId, String stateHash, Instant now);
    /** Compare-and-set: a newer connection attempt must never be overwritten. */
    boolean complete(UUID ownerId, String stateHash, SellerCredentials credentials);
    Optional<Instant> authorizationExpiry(UUID ownerId);
}
