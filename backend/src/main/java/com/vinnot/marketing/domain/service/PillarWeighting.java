package com.vinnot.marketing.domain.service;

import com.vinnot.marketing.domain.model.PillarPerformance;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * The performance factor of each pillar (#510): its engagement per view (interactions over views) against the overall
 * engagement per view of every measured pillar, bounded to {@link #MIN_FACTOR}..{@link #MAX_FACTOR}. A pillar stays
 * {@link #NEUTRAL} until it has {@link #MIN_MEASURED_POSTS} measured posts, while it has no views, and while there is no
 * overall engagement to compare with. The planner multiplies each pillar's weight by its factor.
 */
public final class PillarWeighting {
    public static final double MIN_FACTOR = 0.5;
    public static final double MAX_FACTOR = 2.0;
    public static final double NEUTRAL = 1.0;
    public static final int MIN_MEASURED_POSTS = 3;

    private PillarWeighting() {
    }

    /** The factor of every pillar in {@code performances}; pillars absent from it are neutral ({@link #factorOf}). */
    public static Map<String, Double> factors(Collection<PillarPerformance> performances) {
        long views = performances.stream().mapToLong(PillarPerformance::views).sum();
        long interactions = performances.stream().mapToLong(PillarPerformance::interactions).sum();
        Map<String, Double> factors = new LinkedHashMap<>();
        for (PillarPerformance performance : performances) {
            factors.put(performance.pillarCode(), factor(performance, views, interactions));
        }
        return factors;
    }

    /** The pillar's factor, neutral when it has none. */
    public static double factorOf(Map<String, Double> factors, String pillarCode) {
        return factors.getOrDefault(pillarCode, NEUTRAL);
    }

    private static double factor(PillarPerformance performance, long totalViews, long totalInteractions) {
        if (performance.measuredPosts() < MIN_MEASURED_POSTS || performance.views() <= 0 || totalViews <= 0 || totalInteractions <= 0) {
            return NEUTRAL;
        }
        double rate = (double) performance.interactions() / performance.views();
        double overall = (double) totalInteractions / totalViews;
        return Math.clamp(rate / overall, MIN_FACTOR, MAX_FACTOR);
    }
}
