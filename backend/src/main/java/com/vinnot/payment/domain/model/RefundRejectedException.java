package com.vinnot.payment.domain.model;

import java.util.Objects;

/**
 * The provider definitively refused a refund, so no money moved and the same request may be sent again once the
 * cause is fixed. Carries only a short reason code (for example {@code HTTP_428:insufficient_money_for_refund} or a
 * policy rule), never provider messages, payer data or credentials.
 */
public final class RefundRejectedException extends RuntimeException {
    private static final String REASON = "[A-Za-z0-9_.:-]{1,64}";
    private final String reason;

    public RefundRejectedException(String reason) {
        super("Refund rejected by the payment provider: " + checked(reason));
        this.reason = reason;
    }

    public String reason() {
        return reason;
    }

    private static String checked(String reason) {
        if (Objects.isNull(reason) || !reason.matches(REASON)) {
            throw new IllegalArgumentException("A refund rejection needs a short reason code");
        }
        return reason;
    }
}
