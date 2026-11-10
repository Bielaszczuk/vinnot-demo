package com.vinnot.review.application.port.out;

import java.math.BigDecimal;
import java.util.UUID;

public interface CellarCommandPort {

    /**
     * Syncs a review to the user's cellar (auto-add or update).
     *
     * @param userId the user ID
     * @param wineId the wine ID
     * @param rating the review rating, one decimal from 0.1 to 5.0
     * @param notes   the review notes
     * @param vintage the tasted vintage, or {@code null} to keep the cellar vintage
     */
    void syncReviewToCellar(UUID userId, UUID wineId, BigDecimal rating, String notes, Integer vintage);

    /**
     * Syncs only a review rating to the user's cellar, keeping the cellar notes.
     *
     * @param userId the user ID
     * @param wineId the wine ID
     * @param rating  the review rating, one decimal from 0.1 to 5.0
     * @param vintage the tasted vintage, or {@code null} to keep the cellar vintage
     */
    void syncReviewRatingToCellar(UUID userId, UUID wineId, BigDecimal rating, Integer vintage);
}
