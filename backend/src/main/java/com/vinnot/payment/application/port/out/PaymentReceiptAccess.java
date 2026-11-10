package com.vinnot.payment.application.port.out;
import java.util.Optional;
import java.util.UUID;

/** Opaque, expiring capability that exposes only the payment outcome, never a ticket. */
public interface PaymentReceiptAccess {
    String issue(UUID attemptId);
    Optional<UUID> verify(String token);
}
