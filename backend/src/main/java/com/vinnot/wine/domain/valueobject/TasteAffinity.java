package com.vinnot.wine.domain.valueobject;

import java.math.BigDecimal;

/**
 * How much a user likes a grape or a wine type, from the average of their own ratings (#306). Only a strong affinity
 * leads to a recommendation: several rated wines with a high average, so one lucky bottle never decides.
 */
public final class TasteAffinity {
    /** Fewest rated wines of a grape or type before it counts. */
    public static final int MIN_RATED_WINES = 3;
    /** Lowest average rating, on the 0.5 to 5 scale, that counts as liking it. */
    public static final BigDecimal MIN_AVERAGE = new BigDecimal("4.0");

    /** What the affinity is about. */
    public enum Kind { GRAPE, TYPE }

    private TasteAffinity() {
    }

    public static boolean strong(BigDecimal average, int ratedWines) {
        return ratedWines >= MIN_RATED_WINES && average.compareTo(MIN_AVERAGE) >= 0;
    }
}
