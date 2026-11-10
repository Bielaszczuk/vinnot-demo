package com.vinnot.shared.infrastructure.web.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.math.BigDecimal;
import java.util.Objects;

/** Checks {@link OneDecimalRating}: trailing zeros do not count as decimals, as in the review and cellar domain. */
public class OneDecimalRatingValidator implements ConstraintValidator<OneDecimalRating, BigDecimal> {
    private static final BigDecimal MIN = new BigDecimal("0.1");
    private static final BigDecimal MAX = new BigDecimal("5.0");

    @Override
    public boolean isValid(BigDecimal rating, ConstraintValidatorContext context) {
        return Objects.isNull(rating)
                || (rating.compareTo(MIN) >= 0 && rating.compareTo(MAX) <= 0 && rating.stripTrailingZeros().scale() <= 1);
    }
}
