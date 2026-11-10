package com.vinnot.engagement.domain.model;

import java.time.Duration;
import java.util.Objects;

/**
 * Why a candidate fits an account, each signal normalised to 0-1 by {@link #strength()}: taste fit (how well it matches
 * what the account rates highly), freshness (how new the content is), proximity (in the account's area or a region
 * it likes) and view recency (how recently the account looked at it or at similar content).
 *
 * @param fit         0-1, values outside are clamped
 * @param age         how old the content is, or null when unknown
 * @param nearby      in the account's area or a region it likes
 * @param sinceViewed time since the related view, or null when there was none
 */
public record CandidateSignals(double fit, Duration age, boolean nearby, Duration sinceViewed) {
    static final double FIT_WEIGHT = 0.55;
    static final double FRESHNESS_WEIGHT = 0.20;
    static final double PROXIMITY_WEIGHT = 0.15;
    static final double VIEW_WEIGHT = 0.10;
    /** Content older than this is no longer fresh. */
    static final Duration FRESH_FOR = Duration.ofDays(60);
    /** A view older than this no longer counts as recent. */
    static final Duration VIEW_RECENT_FOR = Duration.ofDays(14);

    public static CandidateSignals fit(double fit) {
        return new CandidateSignals(fit, null, false, null);
    }

    public double strength() {
        return FIT_WEIGHT * clamp(fit) + FRESHNESS_WEIGHT * decay(age, FRESH_FOR)
                + PROXIMITY_WEIGHT * (nearby ? 1 : 0) + VIEW_WEIGHT * decay(sinceViewed, VIEW_RECENT_FOR);
    }

    private static double decay(Duration elapsed, Duration horizon) {
        if (Objects.isNull(elapsed)) {
            return 0;
        }
        return clamp(1 - (double) Math.max(0, elapsed.toMinutes()) / horizon.toMinutes());
    }

    private static double clamp(double value) {
        return Math.max(0, Math.min(1, value));
    }
}
