package com.vinnot.engagement.domain.model;

import com.vinnot.notification.domain.model.NotificationType;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Objects;

/**
 * The engagement budget (#405, S10 and S12). At most {@code weeklyLimit} engagement pushes in any rolling 7 days,
 * {@code dailyLimit} per local calendar day and {@code minimumGap} between two. After {@code fatigueStreak} sent pushes
 * in a row without an open the account gets at most {@code fatiguedWeeklyLimit} a week; after {@code pauseAfter} of
 * pushes without any open it gets none until it opens the app (come-back pushes excepted). When an account got none
 * in the last 7 days, the best candidate is owed whatever its score; a further one in the same week needs at least
 * {@code secondPushMinScore}.
 */
public record EngagementPolicy(int weeklyLimit, int dailyLimit, Duration minimumGap, int fatigueStreak,
        int fatiguedWeeklyLimit, Duration pauseAfter, double secondPushMinScore) {
    public static final Duration WEEK = Duration.ofDays(7);
    private static final int WEEKLY_LIMIT = 2;
    private static final Duration MINIMUM_GAP = Duration.ofHours(48);
    private static final int FATIGUE_STREAK = 3;
    private static final Duration PAUSE_AFTER = Duration.ofDays(28);
    private static final double SECOND_PUSH_MIN_SCORE = 0.6;

    public EngagementPolicy {
        Objects.requireNonNull(minimumGap, "minimumGap");
        Objects.requireNonNull(pauseAfter, "pauseAfter");
        if (weeklyLimit < 1 || dailyLimit < 1 || fatigueStreak < 1 || fatiguedWeeklyLimit < 1
                || fatiguedWeeklyLimit > weeklyLimit || minimumGap.isNegative() || !pauseAfter.isPositive()
                || secondPushMinScore < 0 || secondPushMinScore > 1) {
            throw new IllegalArgumentException("Invalid engagement policy");
        }
    }

    /** The approved strategy: 2 a week, 1 a day, 48 h apart; 1 a week after 3 unopened; paused after 4 weeks. */
    public static EngagementPolicy standard() {
        return new EngagementPolicy(WEEKLY_LIMIT, 1, MINIMUM_GAP, FATIGUE_STREAK, 1, PAUSE_AFTER, SECOND_PUSH_MIN_SCORE);
    }

    /**
     * Whether a push of {@code type} may go out at {@code at}. Come-back pushes ({@link NotificationType#WINBACK}) are
     * exempt from the long pause, which only an app open ends: they exist for accounts that stopped opening the app, and
     * their own two-attempt limit then silences them. The budget still applies to them.
     */
    public EngagementVerdict admits(NotificationType type, EngagementHistory history, ZoneId zone, Instant at) {
        if (type != NotificationType.WINBACK && history.pausedAt(at, pauseAfter)) {
            return EngagementVerdict.PAUSED;
        }
        int lastWeek = history.countSince(at.minus(WEEK));
        boolean fatigued = history.unopenedStreak() >= fatigueStreak;
        if (fatigued && lastWeek >= fatiguedWeeklyLimit && lastWeek < weeklyLimit) {
            return EngagementVerdict.FATIGUED;
        }
        if (lastWeek >= weeklyLimit || history.countOnLocalDay(at, zone) >= dailyLimit
                || history.anyWithin(minimumGap, at)) {
            return EngagementVerdict.OVER_BUDGET;
        }
        return EngagementVerdict.ALLOWED;
    }

    /** No engagement push in the last 7 days: the weekly minimum owes one when a candidate exists. */
    public boolean owesWeeklyPush(EngagementHistory history, Instant at) {
        return history.countSince(at.minus(WEEK)) == 0;
    }
}
