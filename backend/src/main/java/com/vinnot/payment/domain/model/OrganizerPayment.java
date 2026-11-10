package com.vinnot.payment.domain.model;

import java.math.BigDecimal;
import java.util.UUID;
import java.util.Objects;

/** Financial projection for an authorized organizer; never contains credentials or payer data. */
public record OrganizerPayment(UUID registrationId, UUID attemptId, BigDecimal amount, String currency,
        ProviderPayment.Status paymentStatus, BigDecimal refundedAmount, RefundIntent.Status refundStatus,
        boolean needsReview, boolean holdsCapacity) {
    /** A first request, or a new request after the provider rejected the previous one (no money moved). */
    public boolean canRefund() {
        return RefundEligibility.permits(paymentStatus, refundedAmount, needsReview, holdsCapacity)
                && (Objects.isNull(refundStatus) || refundStatus == RefundIntent.Status.REJECTED);
    }
}
