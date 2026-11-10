package com.vinnot.payment.application.service;

import com.vinnot.payment.application.port.in.ApplyProviderPaymentUseCase;
import com.vinnot.payment.application.port.in.ReconcilePaymentsUseCase;
import com.vinnot.payment.application.port.out.CheckoutAttemptStore;
import com.vinnot.payment.application.port.out.PaymentLedger;
import com.vinnot.payment.application.port.out.PaymentProviderGateway;
import com.vinnot.payment.application.port.out.PaymentReconciliationQueue;
import com.vinnot.payment.application.port.out.RefundStore;
import com.vinnot.payment.application.port.out.SellerCredentialReader;
import com.vinnot.payment.domain.model.CheckoutSnapshot;
import com.vinnot.payment.domain.model.ReconciliationClaim;
import com.vinnot.payment.domain.model.SellerCredentials;
import com.vinnot.payment.domain.model.RefundIntent;
import com.vinnot.payment.domain.model.RefundRejectedException;
import com.vinnot.payment.domain.model.ProviderPayment;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** External I/O never runs within a database transaction. Work is leased and acknowledgements are fenced. */
public class ReconcilePaymentsService implements ReconcilePaymentsUseCase {
    private static final Logger LOG = LoggerFactory.getLogger(ReconcilePaymentsService.class);
    private static final int MAXIMUM_BATCH = 20;
    private static final int MAXIMUM_PAYMENTS = 20;
    private final CheckoutAttemptStore attempts;
    private final PaymentReconciliationQueue queue;
    private final PaymentLedger ledger;
    private final SellerCredentialReader credentials;
    private final PaymentProviderGateway provider;
    private final ApplyProviderPaymentUseCase settlement;
    private final RefundStore refunds;
    private final RefundRejectionRecorder rejections;
    private final Clock clock;

    public ReconcilePaymentsService(CheckoutAttemptStore attempts, PaymentReconciliationQueue queue, PaymentLedger ledger,
            SellerCredentialReader credentials, PaymentProviderGateway provider, ApplyProviderPaymentUseCase settlement,
            RefundStore refunds, RefundRejectionRecorder rejections, Clock clock) {
        this.attempts = attempts;
        this.queue = queue;
        this.ledger = ledger;
        this.credentials = credentials;
        this.provider = provider;
        this.settlement = settlement;
        this.refunds = refunds;
        this.rejections = rejections;
        this.clock = clock;
    }

    @Override
    @Transactional(propagation = Propagation.NEVER)
    public void execute(int limit) {
        if (limit < 1 || limit > MAXIMUM_BATCH) {
            throw new IllegalArgumentException("Reconciliation batch must contain 1 to 20 jobs");
        }
        for (int index = 0; index < limit; index++) {
            var claims = queue.claimDue(clock.instant(), 1);
            if (claims.isEmpty()) {
                return;
            }
            var claim = claims.getFirst();
            Optional<Instant> expiresAt = Optional.empty();
            try {
                var snapshot = attempts.dispatchedSnapshot(claim.attemptId()).orElseThrow();
                expiresAt = Optional.of(snapshot.expiresAt());
                if (Objects.isNull(snapshot.organizerId())) {
                    // The organizer's account was deleted with its Mercado Pago connection: nothing can be read or
                    // refunded anymore. Parked instead of failing forever; the attempt and its evidence stay as history.
                    queue.park(claim);
                    continue;
                }
                boolean settled = reconcile(claim, snapshot);
                ReconciliationSchedule.afterSuccess(snapshot.expiresAt(), settled, clock.instant()).ifPresentOrElse(
                        next -> queue.finish(claim, next, null), () -> queue.park(claim));
            } catch (RuntimeException unavailable) {
                // Persist only a stable code. Provider bodies, tokens and payer details never enter logs or the queue.
                queue.finish(claim, ReconciliationSchedule.afterFailure(expiresAt, clock.instant()),
                        "PAYMENT_RECONCILIATION_REQUIRED");
            }
        }
    }

    /** @return whether every observed payment is final and no refund is outstanding. */
    private boolean reconcile(ReconciliationClaim claim, CheckoutSnapshot snapshot) {
        var seller = credentials.findCredentials(snapshot.organizerId())
                .filter(value -> value.sellerId().equals(snapshot.sellerId()) && value.expiresAt().isAfter(clock.instant())).orElseThrow();
        var ids = new LinkedHashSet<>(ledger.knownPayments(snapshot.id()));
        ids.addAll(provider.search(snapshot.id(), seller));
        if (ids.size() > MAXIMUM_PAYMENTS) {
            throw new IllegalStateException("Payment count requires operator review");
        }
        boolean settled = true;
        for (String id : ids) {
            var payment = readPayment(id, seller);
            settlement.apply(snapshot, payment, claim);
            settled &= ReconciliationSchedule.isFinal(payment);
        }
        var pending = refunds.pending(snapshot.id());
        for (var refund : pending) {
            refund(refund, snapshot, seller, claim);
        }
        return settled && pending.isEmpty();
    }

    private ProviderPayment readPayment(String id, SellerCredentials seller) {
        var payment = provider.read(id, seller);
        if (!id.equals(payment.id())) {
            throw new IllegalArgumentException("Unexpected payment identity");
        }
        return payment;
    }

    private boolean refundedMeanwhile(String paymentId, SellerCredentials seller) {
        var payment = readPayment(paymentId, seller);
        return payment.fullyRefunded() || payment.refundedAmount().signum() > 0
                || payment.status() != ProviderPayment.Status.APPROVED;
    }

    private void refund(RefundIntent refund, CheckoutSnapshot snapshot, SellerCredentials seller, ReconciliationClaim claim) {
        var latest = readPayment(refund.paymentId(), seller);
        latest.verifyAgainst(snapshot);
        settlement.apply(snapshot, latest, claim);
        if (latest.fullyRefunded() || latest.refundedAmount().signum() > 0 || latest.status() != ProviderPayment.Status.APPROVED) {
            return;
        }
        var claimed = refunds.claim(refund.id());
        if (claimed.isEmpty()) {
            return;
        }
        boolean rejected = false;
        try {
            provider.refund(claimed.get(), seller);
        } catch (RefundRejectedException rejection) {
            if (refundedMeanwhile(refund.paymentId(), seller)) {
                // Rejected because the payment was refunded elsewhere (for example from the Mercado Pago panel):
                // verified like any other outcome instead of telling the organizer the money never went back.
                LOG.info("Mercado Pago rejected refund {} ({}) for a payment already refunded; verifying it",
                        refund.id(), rejection.reason());
            } else {
                // No money moved. Reported to the organizer, who can request it again; the retry gets its own key.
                LOG.warn("Mercado Pago rejected refund {} ({}); the organizer can request it again",
                        refund.id(), rejection.reason());
                rejections.rejected(snapshot, claimed.get(), rejection.reason());
                rejected = true;
                return;
            }
        } finally {
            // Even HTTP 2xx requires authoritative payment verification. A crash leaves SENDING for read-only recovery.
            // A rejection that could not be recorded is treated like any other unknown outcome.
            if (!rejected) {
                refunds.uncertain(refund.id());
            }
        }
        settlement.apply(snapshot, readPayment(refund.paymentId(), seller), claim);
    }
}
