package com.vinnot.cellar.domain.model;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** S8: the cellar's personal rating has one decimal between 0.1 and 5.0, like a review's. */
class CellarRatingScaleTest {

    @ParameterizedTest
    @ValueSource(strings = {"0.1", "5.0", "2.2", "4"})
    void keepsTheDecimalAsGiven(String rating) {
        CellarWine entry = CellarWine.create(UUID.randomUUID(), UUID.randomUUID());

        entry.updateRating(new BigDecimal(rating));

        assertThat(entry.getRating()).isEqualByComparingTo(rating);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0.05", "5.1", "2.15", "0"})
    void rejectsOtherScalesAndKeepsThePreviousRating(String rating) {
        CellarWine entry = CellarWine.create(UUID.randomUUID(), UUID.randomUUID());
        entry.updateRating(new BigDecimal("3.5"));

        assertThatThrownBy(() -> entry.updateRating(new BigDecimal(rating)))
                .isInstanceOf(DomainException.class).extracting("code").isEqualTo("INVALID_RATING");
        assertThat(entry.getRating()).isEqualByComparingTo("3.5");
    }
}
