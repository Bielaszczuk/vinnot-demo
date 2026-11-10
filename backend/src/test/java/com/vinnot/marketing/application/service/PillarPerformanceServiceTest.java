package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.ContentPillarResponse;
import com.vinnot.marketing.application.port.out.SocialMetricsRepository;
import com.vinnot.marketing.domain.model.ContentPillar;
import com.vinnot.marketing.domain.model.PillarPerformance;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** #510 S7 and S10: the pillars' performance over the weighting window becomes the planner's factors and the admin's figures. */
class PillarPerformanceServiceTest {
    private static final Instant NOW = Instant.parse("2026-11-02T12:00:00Z");
    private static final Instant NINETY_DAYS_AGO = Instant.parse("2026-08-04T12:00:00Z");
    private final SocialMetricsRepository metrics = mock(SocialMetricsRepository.class);
    private final PillarPerformanceService service = new PillarPerformanceService(metrics, 90, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void theFactorsComeFromTheLastNinetyDaysOfMetrics() {
        when(metrics.pillarPerformance(NINETY_DAYS_AGO)).thenReturn(List.of(new PillarPerformance("EDUCATION", 3, 1024, 384),
                new PillarPerformance("CURIOUS_FACT", 4, 1024, 128)));

        assertThat(service.factors(NOW)).containsOnlyKeys("EDUCATION", "CURIOUS_FACT");
        assertThat(service.factors(NOW).get("EDUCATION")).isEqualTo(1.5);
        assertThat(service.factors(NOW).get("CURIOUS_FACT")).isEqualTo(0.5);
    }

    @Test
    void thePillarsAreListedInOrderWithTheirSwitchesAndPerformanceAndUnmeasuredOnesAreNeutral() {
        when(metrics.pillarPerformance(NINETY_DAYS_AGO)).thenReturn(List.of(new PillarPerformance("EDUCATION", 3, 1024, 384),
                new PillarPerformance("CURIOUS_FACT", 4, 1024, 128)));
        ContentPillar education = new ContentPillar("EDUCATION", "Educación", "Education", 2, "b", "b", 3, true, true);
        ContentPillar humor = new ContentPillar("HUMOR", "Humor", "Humor", 1, "b", "b", 8, false, false);
        ContentPillar curious = new ContentPillar("CURIOUS_FACT", "Dato curioso", "Curious fact", 2, "b", "b", 2);

        assertThat(service.present(List.of(humor, education, curious))).containsExactly(
                new ContentPillarResponse("CURIOUS_FACT", "Dato curioso", "Curious fact", 2, true, false,
                        new ContentPillarResponse.Performance(4, 1024, 128, 0.5)),
                new ContentPillarResponse("EDUCATION", "Educación", "Education", 2, true, true,
                        new ContentPillarResponse.Performance(3, 1024, 384, 1.5)),
                new ContentPillarResponse("HUMOR", "Humor", "Humor", 1, false, false, new ContentPillarResponse.Performance(0, 0, 0, 1.0)));
    }

    @Test
    void theWindowIsConfiguredInDaysAndMustBePositive() {
        when(metrics.pillarPerformance(Instant.parse("2026-10-26T12:00:00Z"))).thenReturn(List.of());
        assertThat(new PillarPerformanceService(metrics, 7, Clock.systemUTC()).factors(NOW)).isEmpty();
        assertThat(new PillarPerformanceService(metrics, 7)).isNotNull();
        assertThatThrownBy(() -> new PillarPerformanceService(metrics, 0)).isInstanceOf(IllegalArgumentException.class);
    }
}
