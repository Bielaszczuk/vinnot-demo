package com.vinnot.marketing.domain.service;

import com.vinnot.marketing.domain.model.PillarPerformance;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.offset;

/**
 * #510 S7: a pillar's factor is its engagement per view against the overall engagement per view, bounded to 0.5-2.0 and
 * neutral until the pillar has three measured posts or while there is no data to compare with.
 */
class PillarWeightingTest {

    @Test
    void theFactorIsThePillarRateOverTheOverallRate() {
        // overall: 300 interactions / 3000 views = 0.1; EDUCATION 0.15, CURIOUS_FACT 0.075
        Map<String, Double> factors = PillarWeighting.factors(List.of(new PillarPerformance("EDUCATION", 3, 1000, 150),
                new PillarPerformance("CURIOUS_FACT", 4, 2000, 150)));

        assertThat(factors).containsOnlyKeys("EDUCATION", "CURIOUS_FACT");
        assertThat(factors.get("EDUCATION")).isEqualTo(1.5, offset(1e-9));
        assertThat(factors.get("CURIOUS_FACT")).isEqualTo(0.75, offset(1e-9));
    }

    @Test
    void theFactorIsBoundedBetweenHalfAndDouble() {
        // overall: 1010 / 11000; QUIZ 1000/1000 is about 10.9 times it, MYTH 10/10000 about 0.01 times it
        Map<String, Double> factors = PillarWeighting.factors(List.of(new PillarPerformance("QUIZ", 3, 1000, 1000),
                new PillarPerformance("MYTH_VS_REALITY", 5, 10_000, 10)));

        assertThat(factors).containsEntry("QUIZ", PillarWeighting.MAX_FACTOR).containsEntry("MYTH_VS_REALITY", PillarWeighting.MIN_FACTOR);
        assertThat(PillarWeighting.MAX_FACTOR).isEqualTo(2.0);
        assertThat(PillarWeighting.MIN_FACTOR).isEqualTo(0.5);
    }

    @Test
    void aPillarWithoutInteractionsGetsTheLowerBound() {
        Map<String, Double> factors = PillarWeighting.factors(List.of(new PillarPerformance("QUIZ", 3, 1000, 0),
                new PillarPerformance("EDUCATION", 3, 1000, 100)));

        assertThat(factors).containsEntry("QUIZ", 0.5).containsEntry("EDUCATION", 2.0);
    }

    @Test
    void aPillarWithFewerThanThreeMeasuredPostsStaysNeutralButCountsInTheAverage() {
        Map<String, Double> factors = PillarWeighting.factors(List.of(new PillarPerformance("QUIZ", 2, 1000, 150),
                new PillarPerformance("EDUCATION", 3, 1000, 100)));

        assertThat(factors.get("QUIZ")).as("two measured posts").isEqualTo(PillarWeighting.NEUTRAL);
        assertThat(factors.get("EDUCATION")).as("100/1000 against 250/2000").isEqualTo(0.8, offset(1e-9));
        assertThat(PillarWeighting.MIN_MEASURED_POSTS).isEqualTo(3);
    }

    @Test
    void aPillarWithoutViewsStaysNeutral() {
        Map<String, Double> factors = PillarWeighting.factors(List.of(new PillarPerformance("QUIZ", 3, 0, 40),
                new PillarPerformance("EDUCATION", 3, 1000, 100)));

        assertThat(factors).containsEntry("QUIZ", 1.0);
    }

    @Test
    void withoutOverallViewsOrInteractionsEveryPillarStaysNeutral() {
        assertThat(PillarWeighting.factors(List.of(new PillarPerformance("QUIZ", 3, 0, 0)))).containsEntry("QUIZ", 1.0);
        assertThat(PillarWeighting.factors(List.of(new PillarPerformance("QUIZ", 3, 500, 0),
                new PillarPerformance("EDUCATION", 4, 800, 0)))).containsEntry("QUIZ", 1.0).containsEntry("EDUCATION", 1.0);
        assertThat(PillarWeighting.factors(List.of())).isEmpty();
    }

    @Test
    void anUnmeasuredPillarIsNeutral() {
        assertThat(PillarWeighting.factorOf(Map.of("QUIZ", 1.8), "QUIZ")).isEqualTo(1.8);
        assertThat(PillarWeighting.factorOf(Map.of("QUIZ", 1.8), "EDUCATION")).isEqualTo(1.0);
    }
}
