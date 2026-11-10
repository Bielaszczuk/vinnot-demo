package com.vinnot.shared.infrastructure.web.validation;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/** S8: one rule for every rating request, trailing zeros included, matching the domain. */
class OneDecimalRatingValidatorTest {
    private final OneDecimalRatingValidator validator = new OneDecimalRatingValidator();

    @ParameterizedTest
    @ValueSource(strings = {"0.1", "0.10", "3.6", "3.60", "4", "4.0", "5", "5.0", "5.00"})
    void acceptsOneSignificantDecimalBetweenAPointOneAndFive(String rating) {
        assertThat(validator.isValid(new BigDecimal(rating), null)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"3.65", "0.05", "5.1", "5.01", "0", "0.0", "-1"})
    void rejectsMoreDecimalsAndValuesOutsideTheRange(String rating) {
        assertThat(validator.isValid(new BigDecimal(rating), null)).isFalse();
    }

    @Test
    void leavesARequiredRatingToNotNull() {
        assertThat(validator.isValid(null, null)).isTrue();
    }
}
