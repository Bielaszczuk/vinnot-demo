package com.vinnot.marketing.domain.model;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** #510 S6 and S7: a network may not give every metric; the interactions add up the ones it gives. */
class PublicationMetricsTest {

    @Test
    void interactionsAddLikesCommentsSavesAndShares() {
        PublicationMetrics metrics = new PublicationMetrics(1_000L, 800L, 40L, 5L, 7L, 3L, 2L);

        assertThat(metrics.interactions()).isEqualTo(55L);
    }

    @Test
    void aMetricTheNetworkDoesNotGiveCountsAsNothing() {
        assertThat(new PublicationMetrics(500L, null, 10L, null, null, 2L, null).interactions()).isEqualTo(12L);
        assertThat(new PublicationMetrics(null, null, null, null, null, null, null).interactions()).isZero();
    }

    @Test
    void aPillarPerformanceKeepsItsTotals() {
        PillarPerformance performance = new PillarPerformance("CURIOUS_FACT", 3, 1_500L, 90L);

        assertThat(performance.pillarCode()).isEqualTo("CURIOUS_FACT");
        assertThat(performance.measuredPosts()).isEqualTo(3);
        assertThat(performance.views()).isEqualTo(1_500L);
        assertThat(performance.interactions()).isEqualTo(90L);
    }
}
