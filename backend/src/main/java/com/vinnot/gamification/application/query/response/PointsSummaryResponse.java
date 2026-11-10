package com.vinnot.gamification.application.query.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * {@code GET /users/me/points}. Tier fields are tier keys; {@code nextTier} and {@code nextTierAt} are null at the
 * top of the ladder.
 *
 * @param points             current points
 * @param tier               current tier
 * @param nextTier           the next tier, or null
 * @param nextTierAt         the points the next tier needs, or null
 * @param tierFloor          the points the current tier needs
 * @param todayEarned        points earned today within the daily cap
 * @param dailyCap           the daily cap
 * @param pendingCelebration the highest tier reached and not celebrated yet, or null
 * @param showWelcome        whether the one-time welcome card is pending
 * @param recent             the last movements, newest first; revocations are negative
 */
public record PointsSummaryResponse(int points, String tier, String nextTier, Integer nextTierAt, int tierFloor,
        int todayEarned, int dailyCap, String pendingCelebration, boolean showWelcome, List<Entry> recent) {

    /**
     * One movement.
     *
     * @param id        the movement
     * @param source    the point source key
     * @param points    positive for an award, negative for a revocation
     * @param createdAt when it happened
     * @param label     the related wine or event name, or null
     */
    public record Entry(UUID id, String source, int points, Instant createdAt, String label) {
    }
}
