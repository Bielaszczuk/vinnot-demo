package com.vinnot.wine.domain.valueobject;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class TasteAffinityTest {
    @Test
    void onlySeveralWellRatedWinesMakeAStrongAffinity() {
        assertThat(TasteAffinity.strong(new BigDecimal("4.00"), 3)).isTrue();
        assertThat(TasteAffinity.strong(new BigDecimal("4.80"), 12)).isTrue();
        assertThat(TasteAffinity.strong(new BigDecimal("3.99"), 10)).as("average below 4").isFalse();
        assertThat(TasteAffinity.strong(new BigDecimal("5.00"), 2)).as("one lucky bottle never decides").isFalse();
    }
}
