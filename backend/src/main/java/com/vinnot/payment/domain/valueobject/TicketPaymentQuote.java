package com.vinnot.payment.domain.valueobject;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/**
 * Immutable ARS quote; the marketplace commission is deducted from the seller. The quote carries the commission
 * policy it was priced with, so a stored checkout keeps its own rate after the current policy changes.
 */
public record TicketPaymentQuote(BigDecimal unitPrice, int quantity, String currency, CommissionPolicy commissionPolicy) {
    private static final int MAXIMUM_QUANTITY = 20;
    private static final int BASIS_POINTS_SCALE = 4;
    private static final int MONEY_SCALE = 2;

    public TicketPaymentQuote {
        Objects.requireNonNull(unitPrice, "unitPrice");
        Objects.requireNonNull(commissionPolicy, "commissionPolicy");
        unitPrice = unitPrice.setScale(MONEY_SCALE, RoundingMode.UNNECESSARY);
        if (unitPrice.signum() <= 0 || quantity < 1 || quantity > MAXIMUM_QUANTITY || !"ARS".equals(currency)) {
            throw new IllegalArgumentException("A paid ticket requires a positive ARS price and 1 to 20 attendees");
        }
    }

    public BigDecimal total() {
        return unitPrice.multiply(BigDecimal.valueOf(quantity));
    }

    public int commissionBasisPoints() {
        return commissionPolicy.basisPoints();
    }

    /** total x basis points / 10000, rounded once on the whole order, HALF_UP to cents. */
    public BigDecimal commission() {
        return total().multiply(BigDecimal.valueOf(commissionPolicy.basisPoints()))
                .movePointLeft(BASIS_POINTS_SCALE).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }

    /** Mercado Pago's own fee still needs to be deducted from this amount. */
    public BigDecimal sellerAmountBeforeProviderFee() {
        return total().subtract(commission());
    }
}
