package com.vinnot.payment.domain.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import java.math.RoundingMode;

/** Minimal authoritative provider data. No payer details, card data or raw response is retained. */
public record ProviderPayment(String id, UUID attemptId, String sellerId, boolean accountEnvironmentVerified,
        BigDecimal amount, String currency, BigDecimal applicationFee, BigDecimal refundedAmount,
        Status status, Instant updatedAt, Instant approvedAt) {
    private static final int MAXIMUM_AMOUNT_PRECISION = 19;
    public enum Status { PENDING, APPROVED, REJECTED, CANCELLED, REFUNDED, CHARGED_BACK, IN_MEDIATION }

    public ProviderPayment {
        if (Objects.isNull(id) || !id.matches("[1-9][0-9]{0,19}") || Objects.isNull(sellerId)
                || !sellerId.matches("[1-9][0-9]{0,19}")) {
            throw new IllegalArgumentException("Invalid payment identity");
        }
        Objects.requireNonNull(attemptId);
        Objects.requireNonNull(status);
        Objects.requireNonNull(updatedAt);
        Objects.requireNonNull(currency);
        amount = money(amount);
        applicationFee = money(applicationFee);
        refundedAmount = money(refundedAmount);
        if (amount.signum() <= 0 || applicationFee.signum() < 0 || refundedAmount.signum() < 0
                || refundedAmount.compareTo(amount) > 0 || (status == Status.APPROVED && Objects.isNull(approvedAt))) {
            throw new IllegalArgumentException("Invalid payment amounts or dates");
        }
    }

    public void verifyAgainst(CheckoutSnapshot snapshot) {
        if (!accountEnvironmentVerified || !attemptId.equals(snapshot.id()) || !sellerId.equals(snapshot.sellerId())
                || !currency.equals(snapshot.quote().currency()) || amount.compareTo(snapshot.quote().total()) != 0
                || (status == Status.APPROVED && applicationFee.compareTo(snapshot.quote().commission()) != 0)) {
            throw new IllegalArgumentException("Payment does not match checkout terms");
        }
    }

    public boolean fullyRefunded() { return refundedAmount.compareTo(amount) == 0; }
    public boolean reversed() { return fullyRefunded() || status == Status.CHARGED_BACK; }

    private static BigDecimal money(BigDecimal value) {
        var exact = Objects.requireNonNull(value).setScale(2, RoundingMode.UNNECESSARY);
        if (exact.precision() > MAXIMUM_AMOUNT_PRECISION) {
            throw new IllegalArgumentException("Invalid monetary precision");
        }
        return exact;
    }
}
