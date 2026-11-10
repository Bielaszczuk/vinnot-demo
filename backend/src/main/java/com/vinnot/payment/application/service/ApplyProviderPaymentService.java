package com.vinnot.payment.application.service;

import com.vinnot.payment.application.port.in.ApplyProviderPaymentUseCase;
import com.vinnot.payment.application.port.out.CheckoutEligibility;
import com.vinnot.payment.application.port.out.PaymentLedger;
import com.vinnot.payment.application.port.out.PaymentReconciliationQueue;
import com.vinnot.payment.application.port.out.RefundStore;
import com.vinnot.payment.domain.model.CheckoutSnapshot;
import com.vinnot.payment.domain.model.ProviderPayment;
import com.vinnot.payment.domain.model.ReconciliationClaim;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.model.EventRegistration;
import com.vinnot.event.domain.valueobject.EventStatus;
import com.vinnot.shared.domain.exception.DomainException;
import java.math.BigDecimal;
import java.time.Clock;
import java.util.Objects;
import java.util.Optional;
import org.springframework.transaction.annotation.Transactional;

/** All financial evidence, capacity and registration mutations commit in one local transaction. */
public class ApplyProviderPaymentService implements ApplyProviderPaymentUseCase {
    private final EventRepositoryPort events;
    private final EventRegistrationRepositoryPort registrations;
    private final PaymentLedger ledger;
    private final RefundStore refunds;
    private final PaymentReconciliationQueue queue;
    private final CheckoutEligibility eligibility;
    private final Clock clock;
    private final PaymentNoticeService notices;

    public ApplyProviderPaymentService(EventRepositoryPort events, EventRegistrationRepositoryPort registrations,
            PaymentLedger ledger, RefundStore refunds, PaymentReconciliationQueue queue, CheckoutEligibility eligibility, Clock clock,
            PaymentNoticeService notices) {
        this.events = events;
        this.registrations = registrations;
        this.ledger = ledger;
        this.refunds = refunds;
        this.queue = queue;
        this.eligibility = eligibility;
        this.clock = clock;
        this.notices = notices;
    }

    @Override
    @Transactional
    public void apply(CheckoutSnapshot snapshot, ProviderPayment payment, ReconciliationClaim claim) {
        payment.verifyAgainst(snapshot);
        if (!snapshot.linked()) {
            recordUnlinked(snapshot, payment, claim);
            return;
        }
        var event = events.findByIdForUpdate(snapshot.eventId()).orElseThrow();
        var registration = registrations.findByIdForUpdate(snapshot.registrationId()).orElseThrow();
        queue.requireLease(claim, clock.instant());
        if (!claim.attemptId().equals(snapshot.id()) || !registration.getEventId().equals(snapshot.eventId())
                || !registration.getUserId().equals(snapshot.buyerId()) || !registration.isExternallyManagedPayment()) {
            throw new IllegalArgumentException("Invalid settlement context");
        }
        var previous = ledger.find(payment.id());
        if (outdated(snapshot, payment, previous)) {
            return;
        }
        var winner = ledger.creditedPayment(snapshot.id());
        boolean credited = winner.filter(payment.id()::equals).isPresent();
        boolean review = previous.map(PaymentLedger.Entry::review).orElse(false);
        boolean impaired = impaired(payment);
        if (impaired) {
            review = !payment.reversed();
            if (credited || winner.isEmpty()) {
                release(event, registration);
                registration.reverseVerifiedPayment(payment.fullyRefunded(), clock.instant());
            }
            announceReversal(snapshot, payment, previous.map(PaymentLedger.Entry::payment));
        } else if (payment.status() == ProviderPayment.Status.APPROVED) {
            if (credited) {
                if (!registration.isConfirmed() || event.getStatus() == EventStatus.CANCELLED) {
                    release(event, registration);
                    if (registration.isConfirmed()) {
                        registration.cancel();
                    }
                    refundRequested(snapshot, payment);
                }
            } else if (!review && winner.isEmpty() && eligible(snapshot, payment)) {
                event.confirmHeldAttendees(registration.getAttendeeCount());
                registration.confirmVerifiedPayment(clock.instant());
                credited = true;
                notices.receipt(snapshot, payment);
            } else {
                if (winner.isEmpty()) {
                    release(event, registration);
                    if (!registration.getStatus().isTerminal()) {
                        registration.cancel();
                    }
                }
                refundRequested(snapshot, payment);
            }
        }
        ledger.save(new PaymentLedger.Entry(payment, credited, review));
        refunds.reconcile(payment.id(), payment.fullyRefunded(), impaired && !payment.fullyRefunded());
        events.save(event);
        registrations.save(registration);
    }

    /**
     * The buyer's registration, or the organizer with the event, was deleted with the account: the attempt is history.
     * Provider evidence is still recorded and news announced to whoever still exists, but no ticket or capacity is
     * touched. A credited payment stays as it is; an approved payment that was never credited goes back, because no
     * ticket can be issued for it anymore.
     */
    private void recordUnlinked(CheckoutSnapshot snapshot, ProviderPayment payment, ReconciliationClaim claim) {
        queue.requireLease(claim, clock.instant());
        if (!claim.attemptId().equals(snapshot.id())) {
            throw new IllegalArgumentException("Invalid settlement context");
        }
        var previous = ledger.find(payment.id());
        if (outdated(snapshot, payment, previous)) {
            return;
        }
        boolean credited = ledger.creditedPayment(snapshot.id()).filter(payment.id()::equals).isPresent();
        boolean review = previous.map(PaymentLedger.Entry::review).orElse(false);
        boolean impaired = impaired(payment);
        if (impaired) {
            review = !payment.reversed();
            announceReversal(snapshot, payment, previous.map(PaymentLedger.Entry::payment));
        } else if (payment.status() == ProviderPayment.Status.APPROVED && !credited) {
            refundRequested(snapshot, payment);
        }
        ledger.save(new PaymentLedger.Entry(payment, credited, review));
        refunds.reconcile(payment.id(), payment.fullyRefunded(), impaired && !payment.fullyRefunded());
    }

    /** An older observation than the one recorded is ignored; a payment of another checkout is rejected. */
    private static boolean outdated(CheckoutSnapshot snapshot, ProviderPayment payment, Optional<PaymentLedger.Entry> previous) {
        if (previous.isEmpty()) {
            return false;
        }
        var old = previous.get().payment();
        if (!old.attemptId().equals(snapshot.id())) {
            throw new IllegalArgumentException("Payment already belongs to another checkout");
        }
        return payment.updatedAt().isBefore(old.updatedAt()) || payment.refundedAmount().compareTo(old.refundedAmount()) < 0
                || (old.reversed() && !payment.reversed());
    }

    private static boolean impaired(ProviderPayment payment) {
        return payment.refundedAmount().signum() > 0 || payment.status() == ProviderPayment.Status.CHARGED_BACK
                || payment.status() == ProviderPayment.Status.IN_MEDIATION || payment.status() == ProviderPayment.Status.REFUNDED;
    }

    private void refundRequested(CheckoutSnapshot snapshot, ProviderPayment payment) {
        if (refunds.requireRefund(snapshot.id(), payment.id(), payment.amount())) {
            notices.refundRequested(snapshot, payment);
        }
    }

    /** Only news is announced: more money returned than last observed, or a chargeback seen for the first time. */
    private void announceReversal(CheckoutSnapshot snapshot, ProviderPayment payment, Optional<ProviderPayment> before) {
        var refundedBefore = before.map(ProviderPayment::refundedAmount).orElse(BigDecimal.ZERO);
        if (payment.refundedAmount().compareTo(refundedBefore) > 0) {
            notices.refunded(snapshot, payment);
        }
        if (payment.status() == ProviderPayment.Status.CHARGED_BACK
                && before.map(old -> old.status() != ProviderPayment.Status.CHARGED_BACK).orElse(true)) {
            notices.chargeback(snapshot, payment);
        }
    }

    private boolean eligible(CheckoutSnapshot snapshot, ProviderPayment payment) {
        if (Objects.isNull(payment.approvedAt()) || !payment.approvedAt().isBefore(snapshot.expiresAt())) {
            return false;
        }
        try {
            eligibility.verify(snapshot);
            return true;
        } catch (DomainException unavailable) {
            return false;
        }
    }

    private void release(Event event, EventRegistration registration) {
        if (registration.holdsCapacity()) {
            event.releaseHeldAttendees(registration.getAttendeeCount());
        } else if (registration.isConfirmed()) {
            event.releaseConfirmedAttendees(registration.getAttendeeCount());
        }
    }
}
