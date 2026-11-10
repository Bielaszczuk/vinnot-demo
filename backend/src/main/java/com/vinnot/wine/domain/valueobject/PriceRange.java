package com.vinnot.wine.domain.valueobject;

import com.vinnot.shared.domain.base.ValueObject;
import com.vinnot.shared.domain.exception.DomainException;

import java.math.BigDecimal;
import java.util.Objects;

/**
 * Value object representing a price range for wine.
 */
public final class PriceRange extends ValueObject {

    private final BigDecimal minPrice;
    private final BigDecimal maxPrice;

    private PriceRange(BigDecimal minPrice, BigDecimal maxPrice) {
        validate(minPrice, maxPrice);
        this.minPrice = minPrice;
        this.maxPrice = maxPrice;
    }

    /**
     * Creates a PriceRange.
     *
     * @param minPrice the minimum price
     * @param maxPrice the maximum price
     * @return the PriceRange value object
     */
    public static PriceRange of(BigDecimal minPrice, BigDecimal maxPrice) {
        if (Objects.isNull(minPrice) && Objects.isNull(maxPrice)) {
            return null;
        }
        return new PriceRange(minPrice, maxPrice);
    }

    private void validate(BigDecimal min, BigDecimal max) {
        if (Objects.nonNull(min) && min.compareTo(BigDecimal.ZERO) < 0) {
            throw new DomainException("INVALID_PRICE", "Price cannot be negative");
        }
        if (Objects.nonNull(max) && max.compareTo(BigDecimal.ZERO) < 0) {
            throw new DomainException("INVALID_PRICE", "Price cannot be negative");
        }
        if (Objects.nonNull(min) && Objects.nonNull(max) && min.compareTo(max) > 0) {
            throw new DomainException("INVALID_PRICE_RANGE",
                    "Minimum price cannot be greater than maximum");
        }
    }

    /**
     * Gets the minimum price.
     *
     * @return the minimum price
     */
    public BigDecimal getMinPrice() {
        return minPrice;
    }

    /**
     * Gets the maximum price.
     *
     * @return the maximum price
     */
    public BigDecimal getMaxPrice() {
        return maxPrice;
    }

    @Override
    protected Object[] getEqualityComponents() {
        return new Object[]{minPrice, maxPrice};
    }

    @Override
    public String toString() {
        if (Objects.nonNull(minPrice) && Objects.nonNull(maxPrice)) {
            return String.format("$%s - $%s", minPrice, maxPrice);
        } else if (Objects.nonNull(minPrice)) {
            return String.format("From $%s", minPrice);
        } else if (Objects.nonNull(maxPrice)) {
            return String.format("Up to $%s", maxPrice);
        }
        return "N/A";
    }
}

