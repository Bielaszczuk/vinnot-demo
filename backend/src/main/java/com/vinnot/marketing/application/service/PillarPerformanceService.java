package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.ContentPillarResponse;
import com.vinnot.marketing.application.port.out.SocialMetricsRepository;
import com.vinnot.marketing.domain.model.ContentPillar;
import com.vinnot.marketing.domain.model.PillarPerformance;
import com.vinnot.marketing.domain.service.PillarWeighting;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The pillars' performance over the weighting window ({@code app.marketing.weighting.window-days}, 90 by default, #510):
 * the planner's factors ({@link PillarWeighting}) and the figures the admin sees next to each pillar.
 */
@Service
public class PillarPerformanceService {
    private final SocialMetricsRepository metrics;
    private final Duration window;
    private final Clock clock;

    @Autowired
    public PillarPerformanceService(SocialMetricsRepository metrics, @Value("${app.marketing.weighting.window-days:90}") int windowDays) {
        this(metrics, windowDays, Clock.systemUTC());
    }

    PillarPerformanceService(SocialMetricsRepository metrics, int windowDays, Clock clock) {
        if (windowDays < 1) {
            throw new IllegalArgumentException("app.marketing.weighting.window-days must be at least 1, got " + windowDays);
        }
        this.metrics = metrics;
        this.window = Duration.ofDays(windowDays);
        this.clock = clock;
    }

    /** Each measured pillar's factor from the window before {@code now}; a pillar absent from it is neutral. */
    public Map<String, Double> factors(Instant now) {
        return PillarWeighting.factors(metrics.pillarPerformance(now.minus(window)));
    }

    /** The pillars in rotation order, as the admin lists them, with their performance over the window up to now. */
    public List<ContentPillarResponse> present(List<ContentPillar> pillars) {
        List<PillarPerformance> performance = metrics.pillarPerformance(clock.instant().minus(window));
        Map<String, Double> factors = PillarWeighting.factors(performance);
        Map<String, PillarPerformance> byPillar = performance.stream()
                .collect(Collectors.toMap(PillarPerformance::pillarCode, Function.identity()));
        return pillars.stream().sorted(Comparator.comparingInt(ContentPillar::sortOrder))
                .map(pillar -> response(pillar, byPillar.get(pillar.code()), PillarWeighting.factorOf(factors, pillar.code()))).toList();
    }

    private static ContentPillarResponse response(ContentPillar pillar, PillarPerformance performance, double factor) {
        ContentPillarResponse.Performance figures = Objects.isNull(performance) ? new ContentPillarResponse.Performance(0, 0, 0, factor)
                : new ContentPillarResponse.Performance(performance.measuredPosts(), performance.views(), performance.interactions(), factor);
        return new ContentPillarResponse(pillar.code(), pillar.nameEs(), pillar.nameEn(), pillar.weight(), pillar.active(),
                pillar.autoApprove(), figures);
    }
}
