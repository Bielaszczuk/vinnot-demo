package com.vinnot.payment.domain.model;

/** Public outcome; deliberately excludes amounts, identities and event details. */
public enum PaymentReceiptStatus {
    PENDING,
    CONFIRMED,
    NOT_COMPLETED,
    REFUND_PENDING,
    REFUNDED,
    REVIEW;

    public static PaymentReceiptStatus from(String payment, String registration, boolean review) {
        if (review || "IN_MEDIATION".equals(payment) || "CHARGED_BACK".equals(payment)) {
            return REVIEW;
        }
        if ("REFUNDED".equals(payment)) {
            return REFUNDED;
        }
        if ("APPROVED".equals(payment)) {
            return "CONFIRMED".equals(registration) ? CONFIRMED : REFUND_PENDING;
        }
        if ("REJECTED".equals(payment)
                || "CANCELLED".equals(payment)
                || "EXPIRED".equals(registration)
                || "CANCELLED".equals(registration)) {
            return NOT_COMPLETED;
        }
        return PENDING;
    }
}
