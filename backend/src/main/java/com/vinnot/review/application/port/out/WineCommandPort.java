package com.vinnot.review.application.port.out;

import java.math.BigDecimal;
import java.util.UUID;

public interface WineCommandPort {

    /** Serializes review mutations before recomputing the aggregate. */
    void lockRatingStats(UUID wineId);

    /**
     * Updates the aggregated rating stats of a wine.
     *
     * @param wineId        the wine ID
     * @param ratingAverage the new average rating
     * @param ratingCount   the new rating count
     */
    void updateRatingStats(UUID wineId, BigDecimal ratingAverage, int ratingCount);
}
