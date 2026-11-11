package com.vinnot.gamification.domain.model;

/**
 * What a member earns points for (#455). Each source has its points, an optional per-source daily limit and
 * whether it counts toward the global daily cap (approved wine submissions do not).
 */
public enum PointSource {
    /** An approved review, once per wine. */
    REVIEW(3, PointSource.UNLIMITED, true),
    /** A review note of at least {@link PointRules#LONG_NOTE_LENGTH} characters, once per wine. */
    REVIEW_NOTE(2, PointSource.UNLIMITED, true),
    /** A like received on a review; self-likes count too. */
    LIKE_RECEIVED(1, 5, true),
    /** A comment on someone else's review. */
    COMMENT(1, 3, true),
    /** A NEW wine submission approved into the catalogue; outside the daily cap. */
    WINE_APPROVED(8, PointSource.UNLIMITED, false),
    /** A label scan with an exact wine match, once per wine. */
    SCAN_MATCH(1, 3, true),
    /** A wine added to the cellar by hand, once per wine ever. */
    CELLAR_ADD(1, 3, true),
    /** A confirmed event registration; revoked when it is cancelled, rejected or expires. */
    EVENT_REGISTRATION(4, PointSource.UNLIMITED, true),
    /** A profile with a photo and a first and last name, once. */
    PROFILE_COMPLETE(5, PointSource.UNLIMITED, true),
    /**
     * A new follower with a verified email and at least one approved review (#541), once per follower; revoked when
     * they unfollow or a block ends the follow.
     */
    FOLLOWER_GAINED(1, 10, true);

    private static final int UNLIMITED = -1;

    private final int points;
    private final int dailyLimit;
    private final boolean countsTowardDailyCap;

    PointSource(int points, int dailyLimit, boolean countsTowardDailyCap) {
        this.points = points;
        this.dailyLimit = dailyLimit;
        this.countsTowardDailyCap = countsTowardDailyCap;
    }

    public int points() {
        return points;
    }

    public boolean countsTowardDailyCap() {
        return countsTowardDailyCap;
    }

    /**
     * The points this source grants now, given what the member already earned today: the per-source limit applies
     * first, then the global daily cap; a source outside the cap only has its own limit.
     *
     * @param today points earned today from this source and, within the cap, from every source
     * @return the points to award, possibly fewer than {@link #points()} or zero
     */
    public int grant(DailyEarnings today) {
        int granted = points;
        if (dailyLimit != UNLIMITED) {
            granted = Math.min(granted, Math.max(0, dailyLimit - today.fromSource()));
        }
        if (countsTowardDailyCap) {
            granted = Math.min(granted, Math.max(0, PointRules.DAILY_CAP - today.withinCap()));
        }
        return granted;
    }
}
