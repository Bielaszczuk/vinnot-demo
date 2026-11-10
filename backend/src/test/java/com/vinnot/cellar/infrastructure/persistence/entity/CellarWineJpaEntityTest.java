package com.vinnot.cellar.infrastructure.persistence.entity;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/** S8 (V71 expand/contract): every saved rating also fills the whole rating the previous revision reads. */
class CellarWineJpaEntityTest {

    @ParameterizedTest
    @CsvSource({"3.6, 4", "3.5, 4", "3.4, 3", "0.1, 1", "0.4, 1", "4.5, 5", "5.0, 5", "1.0, 1"})
    void theWholeRatingIsTheDecimalOneRoundedHalfUpBetweenOneAndFive(String rating, int whole) {
        CellarWineJpaEntity entity = new CellarWineJpaEntity();

        entity.setRating(new BigDecimal(rating));

        assertThat(entity.getRating()).isEqualByComparingTo(rating);
        assertThat(entity.getWholeRating()).isEqualTo(whole);
    }

    @Test
    void clearingTheRatingClearsBoth() {
        CellarWineJpaEntity entity = new CellarWineJpaEntity();
        entity.setRating(new BigDecimal("3.6"));

        entity.setRating(null);

        assertThat(entity.getRating()).isNull();
        assertThat(entity.getWholeRating()).isNull();
    }
}
