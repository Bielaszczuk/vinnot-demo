package com.vinnot.wine.domain.valueobject;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RatingTest {

    @Test
    void updatesAnImmutableWeightedAverage() {
        Rating initial = Rating.initial();
        Rating first = initial.addRating(new BigDecimal("4.0"));
        Rating second = first.addRating(new BigDecimal("5.0"));

        assertThat(initial.getCount()).isZero();
        assertThat(second.getCount()).isEqualTo(2);
        assertThat(second.getAverage()).isEqualByComparingTo("4.50");
    }

    @Test
    void validatesPersistedAverageAndCountBoundaries() {
        assertThatThrownBy(() -> Rating.of(new BigDecimal("5.01"), 1))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_RATING");
        assertThatThrownBy(() -> Rating.of(BigDecimal.ZERO, -1))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_RATING_COUNT");
    }
}
