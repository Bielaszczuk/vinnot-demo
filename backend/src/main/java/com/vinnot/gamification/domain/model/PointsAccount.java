package com.vinnot.gamification.domain.model;

import java.time.Instant;
import java.time.ZoneId;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * A member's points and seal (#455). The tier follows the current points and may drop after a revocation, while
 * the highest tier reached only grows: that is what makes a celebration and a push happen once per tier.
 */
public final class PointsAccount {
    private final UUID userId;
    private final ZoneId zone;
    private int points;
    private Tier highestReached;
    private Tier highestCelebrated;
    private boolean welcomeSeen;

    public PointsAccount(UUID userId, ZoneId zone, int points, Tier highestReached, Tier highestCelebrated,
            boolean welcomeSeen) {
        this.userId = Objects.requireNonNull(userId, "userId");
        this.zone = Objects.requireNonNull(zone, "zone");
        this.points = Math.max(0, points);
        this.highestReached = Objects.requireNonNull(highestReached, "highestReached");
        this.highestCelebrated = Objects.requireNonNull(highestCelebrated, "highestCelebrated");
        this.welcomeSeen = welcomeSeen;
    }

    /** A member who never earned points: Brote, nothing to celebrate and no welcome card. */
    public static PointsAccount fresh(UUID userId, ZoneId zone) {
        return new PointsAccount(userId, zone, 0, Tier.BROTE, Tier.BROTE, true);
    }

    /**
     * Adds awarded points.
     *
     * @param awarded the points granted, never negative
     * @return the tier reached for the first time, if this award reached one
     */
    public Optional<Tier> add(int awarded) {
        if (awarded < 0) {
            throw new IllegalArgumentException("Awarded points cannot be negative");
        }
        points += awarded;
        Tier current = tier();
        if (current.isAbove(highestReached)) {
            highestReached = current;
            return Optional.of(current);
        }
        return Optional.empty();
    }

    /** Takes back revoked points; the tier may drop but the highest tier reached stays. */
    public void remove(int revoked) {
        if (revoked < 0) {
            throw new IllegalArgumentException("Revoked points cannot be negative");
        }
        points = Math.max(0, points - revoked);
    }

    /** Marks a tier and every lower one as celebrated; a tier above the highest reached counts as that one. */
    public void celebrate(Tier tier) {
        Tier celebrated = Tier.lower(Objects.requireNonNull(tier, "tier"), highestReached);
        if (celebrated.isAbove(highestCelebrated)) {
            highestCelebrated = celebrated;
        }
    }

    public void dismissWelcome() {
        welcomeSeen = true;
    }

    /** The highest tier reached and not celebrated yet, or {@code null}. */
    public Tier pendingCelebration() {
        return highestReached.isAbove(highestCelebrated) ? highestReached : null;
    }

    /** The start of the member's current day in their own time zone. */
    public Instant dayStart(Instant now) {
        return now.atZone(zone).toLocalDate().atStartOfDay(zone).toInstant();
    }

    public Tier tier() {
        return Tier.forPoints(points);
    }

    public UUID userId() {
        return userId;
    }

    public ZoneId zone() {
        return zone;
    }

    public int points() {
        return points;
    }

    public Tier highestReached() {
        return highestReached;
    }

    public Tier highestCelebrated() {
        return highestCelebrated;
    }

    public boolean welcomeSeen() {
        return welcomeSeen;
    }
}
