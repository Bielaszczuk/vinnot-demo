package com.vinnot.review.domain.model;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** S8: the review itself refuses a rating outside 0.1-5.0 or with more than one decimal. */
class ReviewRatingScaleTest {

    @ParameterizedTest
    @ValueSource(strings = {"0.1", "5.0", "2.2", "4"})
    void keepsTheRatingAsGiven(String rating) {
        Review review = Review.create(UUID.randomUUID(), UUID.randomUUID(), new BigDecimal(rating));
        assertThat(review.getRating()).isEqualByComparingTo(rating);

        review.updateContent(new BigDecimal("0.1"), null, null);
        assertThat(review.getRating()).isEqualByComparingTo("0.1");
    }

    @ParameterizedTest
    @ValueSource(strings = {"0.05", "5.1", "2.15", "0"})
    void rejectsOtherScales(String rating) {
        assertThatThrownBy(() -> Review.create(UUID.randomUUID(), UUID.randomUUID(), new BigDecimal(rating)))
                .isInstanceOf(DomainException.class).extracting("code").isEqualTo("INVALID_RATING");
        Review review = Review.create(UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("3.0"));
        assertThatThrownBy(() -> review.updateContent(new BigDecimal(rating), null, null))
                .isInstanceOf(DomainException.class).extracting("code").isEqualTo("INVALID_RATING");
        assertThat(review.getRating()).isEqualByComparingTo("3.0");
    }
}
