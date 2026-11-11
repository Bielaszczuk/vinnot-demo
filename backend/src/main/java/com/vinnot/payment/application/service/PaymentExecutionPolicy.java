package com.vinnot.payment.application.service;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import java.math.BigDecimal;
import java.util.Objects;

/** Operational payment policy, independent of provider transport and persistence. */
public record PaymentExecutionPolicy(Environment environment, String permittedSellerId, String platformOwnerId) {
    public enum Environment { SANDBOX, LIVE_PILOT, LIVE }
    private static final BigDecimal PILOT_LIMIT = new BigDecimal("50.00");

    public PaymentExecutionPolicy {
        Objects.requireNonNull(environment);
        if (environment == Environment.LIVE && !numeric(platformOwnerId)) {
            throw new IllegalArgumentException("Live payments require an explicit platform owner");
        }
        if (environment == Environment.LIVE_PILOT
                && (!numeric(permittedSellerId) || !numeric(platformOwnerId) || permittedSellerId.equals(platformOwnerId))) {
            throw new IllegalArgumentException("Live pilot requires a distinct, explicitly permitted seller");
        }
    }

    public static PaymentExecutionPolicy sandbox() {
        return new PaymentExecutionPolicy(Environment.SANDBOX, "", "");
    }

    public void requireSeller(String sellerId) {
        if (environment == Environment.LIVE && (!numeric(sellerId) || platformOwnerId.equals(sellerId))) {
            throw new BusinessRuleViolationException("PAYMENT_SELLER_IS_PLATFORM",
                    "Link the organizer's account, not the Vinnot platform account.");
        }
        if (environment == Environment.LIVE_PILOT && !permittedSellerId.equals(sellerId)) {
            throw rejected();
        }
    }

    public void requireAmount(String sellerId, BigDecimal amount, String currency) {
        requireSeller(sellerId);
        if (environment == Environment.LIVE && (!"ARS".equals(currency)
                || Objects.isNull(amount) || amount.signum() <= 0)) {
            throw new BusinessRuleViolationException("PAYMENT_INVALID_AMOUNT",
                    "El pago debe tener un importe positivo en pesos argentinos.");
        }
        if (environment == Environment.LIVE_PILOT && (!"ARS".equals(currency)
                || Objects.isNull(amount) || amount.signum() <= 0 || amount.compareTo(PILOT_LIMIT) > 0)) {
            throw rejected();
        }
    }

    public boolean isLive() { return environment != Environment.SANDBOX; }

    private static boolean numeric(String value) { return Objects.nonNull(value) && value.matches("[1-9][0-9]{0,19}"); }
    private static BusinessRuleViolationException rejected() {
        return new BusinessRuleViolationException("PAYMENT_PILOT_RESTRICTED",
                "This pilot only allows payments of up to $50 to the enabled organizer.");
    }
}
