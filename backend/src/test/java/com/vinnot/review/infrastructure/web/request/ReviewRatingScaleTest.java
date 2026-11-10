package com.vinnot.review.infrastructure.web.request;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/** S8: a review rating goes from 0.1 to 5.0 with at most one decimal; old apps keep sending whole numbers. */
class ReviewRatingScaleTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @ParameterizedTest
    @ValueSource(strings = {"0.1", "5.0", "2.2", "4", "4.0", "3.60", "5.00", "0.10"})
    void acceptsOneDecimalBetweenAPointOneAndFive(String rating) {
        assertThat(validator.validate(new CreateReviewRequest(new BigDecimal(rating), null, null, null))).isEmpty();
        assertThat(validator.validate(new UpdateReviewRequest(new BigDecimal(rating), null, null, null, null))).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"0.05", "5.1", "2.15", "3.65", "0", "-1"})
    void rejectsOtherScalesAndValuesOutsideTheRange(String rating) {
        assertThat(validator.validate(new CreateReviewRequest(new BigDecimal(rating), null, null, null)))
                .extracting(violation -> violation.getPropertyPath().toString()).contains("rating");
        assertThat(validator.validate(new UpdateReviewRequest(new BigDecimal(rating), null, null, null, null)))
                .extracting(violation -> violation.getPropertyPath().toString()).contains("rating");
    }
}
