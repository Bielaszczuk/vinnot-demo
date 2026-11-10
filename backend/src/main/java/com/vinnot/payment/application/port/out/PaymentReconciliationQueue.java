package com.vinnot.payment.application.port.out;
import com.vinnot.payment.domain.model.ReconciliationClaim;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
public interface PaymentReconciliationQueue {
    void notify(UUID attemptId);
    void notifyKnownPayment(String paymentId);
    List<ReconciliationClaim> claimDue(Instant now, int limit);
    /** Fenced transactional lock, acquired after event/registration locks. */
    void requireLease(ReconciliationClaim claim, Instant now);
    void finish(ReconciliationClaim claim, Instant nextCheck, String failureCode);
    /** Releases the lease and stops scheduled polling; only a notification (webhook or local change) wakes the job again. */
    void park(ReconciliationClaim claim);
}
