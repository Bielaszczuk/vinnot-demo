package com.vinnot.wine.domain.valueobject;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PriceRangeTest {

    @Test
    void formatsCompleteAndOpenPriceRanges() {
        assertThat(PriceRange.of(new BigDecimal("10"), new BigDecimal("20")).toString())
                .isEqualTo("$10 - $20");
        assertThat(PriceRange.of(new BigDecimal("10"), null).toString())
                .isEqualTo("From $10");
        assertThat(PriceRange.of(null, new BigDecimal("20")).toString())
                .isEqualTo("Up to $20");
        assertThat(PriceRange.of(null, null)).isNull();
    }

    @Test
    void rejectsNegativeAndInvertedPriceRanges() {
        assertThatThrownBy(() -> PriceRange.of(new BigDecimal("-1"), null))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("INVALID_PRICE");
        assertThatThrownBy(() -> PriceRange.of(
                new BigDecimal("20"), new BigDecimal("10")))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("INVALID_PRICE_RANGE");
    }
}
