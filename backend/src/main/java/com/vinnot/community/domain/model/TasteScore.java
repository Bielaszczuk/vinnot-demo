package com.vinnot.community.domain.model;

import java.math.BigDecimal;
import java.util.Objects;

/**
 * One row of a member's taste profile, computed every night from their ratings: their average score for a wine type
 * or a grape and how many rated wines it comes from.
 *
 * @param kind       a wine type or a grape
 * @param value      the normalised key (an upper-case type or a lower-case grape)
 * @param label      the text to show
 * @param score      the average rating, 0 to 5
 * @param ratedWines how many rated wines the score comes from
 */
public record TasteScore(Kind kind, String value, String label, BigDecimal score, int ratedWines) {
    public enum Kind {
        TYPE,
        GRAPE
    }

    public TasteScore {
        Objects.requireNonNull(kind, "kind");
        Objects.requireNonNull(value, "value");
        Objects.requireNonNull(score, "score");
    }

    /** The key two profiles are compared on. */
    String dimension() {
        return kind.name() + ":" + value;
    }
}
