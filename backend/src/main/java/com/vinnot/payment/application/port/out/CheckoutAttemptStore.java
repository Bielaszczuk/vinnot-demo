package com.vinnot.payment.application.port.out;

import com.vinnot.payment.domain.model.CheckoutAttempt;
import com.vinnot.payment.domain.model.CheckoutSnapshot;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CheckoutAttemptStore {
    /** Joins the registration transaction. Existing terms are immutable; returns the original attempt ID. */
    CheckoutSnapshot prepare(CheckoutSnapshot snapshot);
    Optional<CheckoutAttempt> find(UUID attemptId, UUID buyerId);
    Optional<CheckoutSnapshot> findByRegistration(UUID registrationId, UUID buyerId);
    /** Must commit before contacting the provider. Rejects calls inside an ambient transaction. */
    Optional<CheckoutSnapshot> claim(UUID attemptId, UUID buyerId, Instant now);
    boolean complete(CheckoutAttempt ready);
    void markUncertain(UUID attemptId);
    /** Internal worker access; only attempts already dispatched to the provider. */
    Optional<CheckoutSnapshot> dispatchedSnapshot(UUID attemptId);
    /** Operational candidates only. Never grants permission to retry a provider POST. */
    List<UUID> needingReconciliation(Instant dispatchedBefore, int limit);
}
