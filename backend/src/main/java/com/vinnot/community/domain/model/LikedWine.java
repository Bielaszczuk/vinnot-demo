package com.vinnot.community.domain.model;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * One wine a member rated, as their taste traits read it (#541).
 *
 * @param rating         the member's rating, 0 to 5, which is also the wine's weight
 * @param catalogScores  the structure scores the catalog keeps for the wine, 0 to 100
 * @param profileScores  the structure scores of the wine's AI profile, 0 to 100
 * @param profiled       whether the wine has an AI profile
 * @param families       the aroma families of the AI profile's aromas and flavors
 */
public record LikedWine(BigDecimal rating, Map<TasteTrait, Double> catalogScores,
        Map<TasteTrait, Double> profileScores, boolean profiled, Set<String> families) {

    public LikedWine {
        Objects.requireNonNull(rating, "rating");
        catalogScores = Objects.isNull(catalogScores) ? Map.of() : catalogScores;
        profileScores = Objects.isNull(profileScores) ? Map.of() : profileScores;
        families = Objects.isNull(families) ? Set.of() : Set.copyOf(families);
    }
}
