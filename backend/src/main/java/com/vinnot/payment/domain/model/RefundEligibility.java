package com.vinnot.payment.domain.model;

import java.math.BigDecimal;
import java.util.Objects;

/** Only an undisputed, fully credited payment can start a full refund. */
public final class RefundEligibility {
    private RefundEligibility() { }
    public static boolean permits(ProviderPayment.Status status, BigDecimal refunded, boolean review, boolean holdsCapacity) {
        return status == ProviderPayment.Status.APPROVED && Objects.nonNull(refunded) && refunded.signum() == 0
                && !review && !holdsCapacity;
    }
}
