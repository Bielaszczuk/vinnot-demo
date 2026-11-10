package com.vinnot.shared.domain.valueobject;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MoneyTest {

    @Test
    void performsImmutableArithmeticWithinTheSameCurrency() {
        Money base = Money.ars(new BigDecimal("100.50"));

        assertThat(base.add(Money.ars(new BigDecimal("20.25"))).getAmount())
                .isEqualByComparingTo("120.75");
        assertThat(base.subtract(Money.ars(new BigDecimal("0.50"))).getAmount())
                .isEqualByComparingTo("100.00");
        assertThat(base.multiply(3).getAmount()).isEqualByComparingTo("301.50");
        assertThat(base.getAmount()).isEqualByComparingTo("100.50");
    }

    @Test
    void rejectsNegativeResultsAndCurrencyMismatches() {
        assertThatThrownBy(() -> Money.ars(new BigDecimal("-0.01")))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("NEGATIVE_AMOUNT");
        assertThatThrownBy(() -> Money.ars(BigDecimal.ONE).add(Money.usd(BigDecimal.ONE)))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("CURRENCY_MISMATCH");
        assertThatThrownBy(() -> Money.ars(BigDecimal.ONE)
                .subtract(Money.ars(BigDecimal.TEN)))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("NEGATIVE_AMOUNT");
    }
}
