package com.vinnot.payment.domain.model;
import java.math.BigDecimal;
import java.util.UUID;
/**
 * One full refund per payment. Its id is the provider idempotency key, so resending after an uncertain outcome repeats
 * the same request. After a definite rejection no money moved, so each retry the organizer asks for gets a key of its
 * own ({@code rejections} counts them); reusing the rejected key could replay the cached rejection.
 */
public record RefundIntent(UUID id, UUID attemptId, String paymentId, BigDecimal amount, Status status, int rejections) {

    public RefundIntent(UUID id, UUID attemptId, String paymentId, BigDecimal amount, Status status) {
        this(id, attemptId, paymentId, amount, status, 0);
    }

    /** The key sent to the provider: the intent id, plus the retry number after a rejection. */
    public String idempotencyKey() {
        return rejections == 0 ? id.toString() : id + "-retry-" + rejections;
    }

    /**
     * PREPARED waits to be sent; SENDING is claimed by one worker; UNCERTAIN was sent and is only verified, never sent
     * again; REJECTED was definitively refused by the provider, so no money moved and the organizer may send it again;
     * SUCCEEDED and REVIEW are final.
     */
    public enum Status { PREPARED, SENDING, UNCERTAIN, SUCCEEDED, REVIEW, REJECTED }
}
