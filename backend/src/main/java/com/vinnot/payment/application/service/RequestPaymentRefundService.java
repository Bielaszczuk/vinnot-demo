package com.vinnot.payment.application.service;

import com.vinnot.payment.application.port.in.RequestPaymentRefundUseCase;
import com.vinnot.payment.application.port.out.CheckoutAttemptStore;
import com.vinnot.payment.application.port.out.PaymentLedger;
import com.vinnot.payment.application.port.out.RefundStore;
import com.vinnot.payment.application.port.out.PaymentReconciliationQueue;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.valueobject.Role;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;
import com.vinnot.payment.domain.model.CheckoutSnapshot;
import com.vinnot.payment.domain.model.RefundEligibility;

/**
 * Full refunds only. Authorize using current server-side roles and ownership, never a request boolean. A request for a
 * refund the provider rejected re-arms it for reconciliation; the event row lock serializes concurrent requests.
 */
public class RequestPaymentRefundService implements RequestPaymentRefundUseCase {
    private final CheckoutAttemptStore attempts;
    private final EventRepositoryPort events;
    private final EventRegistrationRepositoryPort registrations;
    private final UserRepositoryPort users;
    private final PaymentLedger ledger;
    private final RefundStore refunds;
    private final PaymentReconciliationQueue queue;
    private final PaymentNoticeService notices;

    public RequestPaymentRefundService(CheckoutAttemptStore attempts, EventRepositoryPort events,
            EventRegistrationRepositoryPort registrations, UserRepositoryPort users, PaymentLedger ledger,
            RefundStore refunds, PaymentReconciliationQueue queue, PaymentNoticeService notices) {
        this.attempts = attempts;
        this.events = events;
        this.registrations = registrations;
        this.users = users;
        this.ledger = ledger;
        this.refunds = refunds;
        this.queue = queue;
        this.notices = notices;
    }

    @Override
    @Transactional
    public void request(UUID attemptId, UUID actorId) {
        // A refund here cancels the buyer's registration: once the buyer or the organizer deleted the account there
        // is none, so the payment stays as history and any refund is made from the provider's panel.
        var snapshot = attempts.dispatchedSnapshot(attemptId).filter(CheckoutSnapshot::linked).orElseThrow(this::unavailable);
        var actor = users.findById(actorId).orElseThrow(this::unavailable);
        if (!actor.isActive() || actor.isLocked() || (!actor.hasRole(Role.ADMIN)
                && !(actor.hasRole(Role.PARTNER) && snapshot.organizerId().equals(actorId)))) {
            throw unavailable();
        }
        var event = events.findByIdForUpdate(snapshot.eventId()).orElseThrow(this::unavailable);
        if (!actor.hasRole(Role.ADMIN) && !actorId.equals(event.getOrganizerId())) {
            throw unavailable();
        }
        var registration = registrations.findByIdForUpdate(snapshot.registrationId()).orElseThrow(this::unavailable);
        var paymentId = ledger.creditedPayment(attemptId).orElseThrow(this::unavailable);
        var entry = ledger.find(paymentId).orElseThrow(this::unavailable);
        var payment = entry.payment();
        if (registration.holdsCapacity()) {
            throw unavailable();
        }
        if (!payment.fullyRefunded()) {
            if (!RefundEligibility.permits(payment.status(), payment.refundedAmount(),
                    entry.review(), registration.holdsCapacity())) {
                throw unavailable();
            }
            if (refunds.requireRefund(attemptId, payment.id(), payment.amount())) {
                notices.refundRequested(snapshot, payment);
            } else {
                // Only a refund the provider rejected is sent again, as the same intent with a retry key. A refund
                // being sent, uncertain or settled is left alone, so a repeated request stays a no-op.
                refunds.retryRejected(payment.id());
            }
            if (registration.isConfirmed()) {
                event.releaseConfirmedAttendees(registration.getAttendeeCount());
            }
            if (!registration.getStatus().isTerminal()) {
                registration.cancel();
            }
            registrations.save(registration);
            events.save(event);
            queue.notify(attemptId);
        }
    }

    private BusinessRuleViolationException unavailable() {
        return new BusinessRuleViolationException("PAYMENT_REFUND_UNAVAILABLE", "You cannot request a refund for this payment.");
    }
}
