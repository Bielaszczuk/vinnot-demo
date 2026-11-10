package com.vinnot.payment.application.port.out;
import com.vinnot.payment.domain.model.RefundIntent;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.OptionalInt;
import java.util.UUID;
public interface RefundStore {
    /** Creates the single refund intent of a payment; true only when this call created it. */
    boolean requireRefund(UUID attemptId, String paymentId, BigDecimal amount);
    List<RefundIntent> pending(UUID attemptId);
    Optional<RefundIntent> claim(UUID refundId);
    void uncertain(UUID refundId);
    /** SENDING to REJECTED with a short reason code; the rejection's number for this intent, or empty when it was not SENDING. */
    OptionalInt reject(UUID refundId, String reason);
    /** REJECTED back to PREPARED on the same intent, which then sends with its next retry key; true only when this call re-armed it. */
    boolean retryRejected(String paymentId);
    void reconcile(String paymentId, boolean fullyRefunded, boolean needsReview);
}
