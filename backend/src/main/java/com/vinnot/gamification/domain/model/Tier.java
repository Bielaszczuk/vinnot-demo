package com.vinnot.gamification.domain.model;

import java.util.Objects;

/**
 * The wax-seal emblem a member shows, chosen by their current points (#455). A tier can drop when points are
 * revoked; the celebration and the push only happen the first time a tier is reached.
 */
public enum Tier {
    BROTE(0),
    PARRA(30),
    RACIMO(80),
    VENDIMIA(160),
    LAGAR(280),
    BARRICA(450),
    CRIANZA(700),
    RESERVA(1000),
    GRAN_RESERVA(1600),
    GRAN_ENOFILO(2600),
    VINNOT(5000);

    private final int threshold;

    Tier(int threshold) {
        this.threshold = threshold;
    }

    /** The points a member needs to show this tier. */
    public int threshold() {
        return threshold;
    }

    /** The highest tier whose threshold the points reach; negative points never happen and count as zero. */
    public static Tier forPoints(int points) {
        Tier reached = BROTE;
        for (Tier tier : values()) {
            if (points >= tier.threshold) {
                reached = tier;
            }
        }
        return reached;
    }

    /** The tier after this one, or {@code null} at the top of the ladder. */
    public Tier next() {
        int index = ordinal() + 1;
        return index < values().length ? values()[index] : null;
    }

    public boolean isAbove(Tier other) {
        return compareTo(Objects.requireNonNull(other, "other tier")) > 0;
    }

    /** The lower of two tiers. */
    public static Tier lower(Tier first, Tier second) {
        return first.compareTo(second) <= 0 ? first : second;
    }
}
