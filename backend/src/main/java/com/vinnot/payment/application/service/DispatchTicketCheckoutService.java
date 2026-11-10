package com.vinnot.payment.application.service;

import com.vinnot.payment.application.port.in.DispatchTicketCheckoutUseCase;
import com.vinnot.payment.application.port.out.CheckoutAttemptStore;
import com.vinnot.payment.application.port.out.CheckoutEligibility;
import com.vinnot.payment.application.port.out.SellerCredentialReader;
import com.vinnot.payment.application.port.out.TicketCheckoutGateway;
import com.vinnot.payment.domain.model.CheckoutAttempt;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import java.net.URI;
import java.time.Clock;
import java.util.Optional;
import java.util.UUID;

/** Dispatches an already persisted reservation snapshot. No database transaction surrounds network I/O. */
public final class DispatchTicketCheckoutService implements DispatchTicketCheckoutUseCase {
    private final CheckoutAttemptStore attempts;
    private final SellerCredentialReader credentials;
    private final TicketCheckoutGateway gateway;
    private final Clock clock;
    private final CheckoutEligibility eligibility;

    public DispatchTicketCheckoutService(CheckoutAttemptStore attempts, SellerCredentialReader credentials,
            TicketCheckoutGateway gateway, Clock clock, CheckoutEligibility eligibility) {
        this.attempts = attempts;
        this.credentials = credentials;
        this.gateway = gateway;
        this.clock = clock;
        this.eligibility = eligibility;
    }

    @Override
    public Optional<URI> execute(UUID attemptId, UUID buyerId) {
        // An attempt whose registration or organizer was deleted is history only; it can never be paid again.
        var attempt = attempts.find(attemptId, buyerId).filter(found -> found.snapshot().linked())
                .orElseThrow(() -> new BusinessRuleViolationException(
                "PAYMENT_CHECKOUT_NOT_FOUND", "No encontramos este intento de pago."));
        var snapshot = attempt.snapshot();
        if (!snapshot.expiresAt().isAfter(clock.instant())) {
            throw new BusinessRuleViolationException("PAYMENT_CHECKOUT_EXPIRED", "El plazo de la reserva venció.");
        }
        eligibility.verify(snapshot);
        if (attempt.status() == CheckoutAttempt.Status.READY) {
            return Optional.of(attempt.checkoutUrl());
        }
        if (attempt.status() != CheckoutAttempt.Status.PREPARED) {
            return Optional.empty();
        }
        var seller = credentials.findCredentials(snapshot.organizerId()).filter(value ->
                value.sellerId().equals(snapshot.sellerId()) && value.expiresAt().isAfter(snapshot.expiresAt()))
                .orElseThrow(() -> new BusinessRuleViolationException("PAYMENT_ACCOUNT_UNAVAILABLE",
                        "El organizador debe revisar su conexión de pagos."));
        if (attempts.claim(attemptId, buyerId, clock.instant()).isEmpty()) {
            return Optional.empty();
        }
        try {
            eligibility.verify(snapshot);
            var checkout = gateway.create(new TicketCheckoutGateway.Request(snapshot.id(), snapshot.registrationId(),
                    snapshot.eventId(), snapshot.title(), snapshot.quote(), snapshot.expiresAt(), snapshot.returnToApp()), seller);
            var ready = new CheckoutAttempt(snapshot, CheckoutAttempt.Status.READY,
                    checkout.providerReference(), checkout.checkoutUrl());
            if (attempts.complete(ready)) {
                eligibility.verify(snapshot);
                return Optional.of(ready.checkoutUrl());
            }
        } catch (RuntimeException ignored) {
            // A failed response or persistence acknowledgement is not evidence that creation failed.
            // Do not chain exceptions: provider bodies and credentials may be embedded in them.
        }
        try {
            attempts.markUncertain(attemptId);
        } catch (RuntimeException ignored) {
            // The committed CREATING claim survives and remains eligible for reconciliation after recovery.
        }
        throw new ExternalServiceUnavailableException("PAYMENT_CHECKOUT_UNCERTAIN",
                "Estamos verificando el inicio del pago. Revisá tu reserva antes de volver a intentar.", null);
    }
}
