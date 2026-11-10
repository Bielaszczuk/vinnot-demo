package com.vinnot.shared.domain.valueobject;

import com.vinnot.shared.domain.base.ValueObject;
import com.vinnot.shared.domain.exception.DomainException;

import java.math.BigDecimal;
import java.util.Objects;

public final class Money extends ValueObject {

    private final BigDecimal amount;
    private final String currency;

    private Money(BigDecimal amount, String currency) {
        validateAmount(amount);
        this.amount = Objects.nonNull(amount) ? amount : BigDecimal.ZERO;
        this.currency = Objects.requireNonNull(currency, "Currency cannot be null");
    }

    /**
     * Creates a Money instance.
     *
     * @param amount   the monetary amount
     * @param currency the currency code (e.g., "USD", "EUR")
     * @return the Money value object
     */
    public static Money of(BigDecimal amount, String currency) {
        return new Money(amount, currency);
    }

    /**
     * Creates a Money instance in USD.
     *
     * @param amount the monetary amount
     * @return the Money value object in USD
     */
    public static Money usd(BigDecimal amount) {
        return new Money(amount, "USD");
    }

    /**
     * Creates a Money instance in ARS (Argentine Peso).
     *
     * @param amount the monetary amount
     * @return the Money value object in ARS
     */
    public static Money ars(BigDecimal amount) {
        return new Money(amount, "ARS");
    }

    /**
     * Creates a zero Money instance.
     *
     * @param currency the currency code
     * @return zero Money value object
     */
    public static Money zero(String currency) {
        return new Money(BigDecimal.ZERO, currency);
    }

    private void validateAmount(BigDecimal value) {
        if (Objects.nonNull(value) && value.compareTo(BigDecimal.ZERO) < 0) {
            throw new DomainException("NEGATIVE_AMOUNT", "Money amount cannot be negative");
        }
    }

    /**
     * Gets the monetary amount.
     *
     * @return the amount
     */
    public BigDecimal getAmount() {
        return amount;
    }

    /**
     * Gets the currency code.
     *
     * @return the currency code
     */
    public String getCurrency() {
        return currency;
    }

    /**
     * Adds another Money to this one.
     *
     * @param other the Money to add
     * @return new Money with the sum
     */
    public Money add(Money other) {
        validateSameCurrency(other);
        return new Money(this.amount.add(other.amount), this.currency);
    }

    /**
     * Subtracts another Money from this one.
     *
     * @param other the Money to subtract
     * @return new Money with the difference
     */
    public Money subtract(Money other) {
        validateSameCurrency(other);
        return new Money(this.amount.subtract(other.amount), this.currency);
    }

    /**
     * Multiplies this money by a factor.
     *
     * @param factor the multiplication factor
     * @return new Money with the product
     */
    public Money multiply(int factor) {
        return new Money(this.amount.multiply(BigDecimal.valueOf(factor)), this.currency);
    }

    /**
     * Checks if this money is greater than another.
     *
     * @param other the Money to compare
     * @return true if this is greater
     */
    public boolean isGreaterThan(Money other) {
        validateSameCurrency(other);
        return this.amount.compareTo(other.amount) > 0;
    }

    private void validateSameCurrency(Money other) {
        Objects.requireNonNull(other, "Other money cannot be null");
        if (!this.currency.equals(other.currency)) {
            throw new DomainException("CURRENCY_MISMATCH", "Cannot operate on different currencies");
        }
    }

    @Override
    protected Object[] getEqualityComponents() {
        return new Object[]{amount, currency};
    }

    @Override
    public String toString() {
        return String.format("%s %s", currency, amount);
    }
}

