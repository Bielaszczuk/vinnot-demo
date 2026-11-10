package com.vinnot.cellar.application.port.out;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WineQueryPort {

    /**
     * Finds enriched wine detail data by ID, including resolved winery information.
     *
     * @param wineId the wine ID
     * @return the wine detail data if found
     */
    Optional<WineDetailData> findById(UUID wineId);

    /** Resolves a set of wines and their wineries without N+1 queries. */
    List<WineDetailData> findAllByIds(Collection<UUID> wineIds);

    record WineDetailData(
            UUID id,
            String name,
            Integer vintage,
            String wineType,
            String style,
            List<String> grapes,
            String wineryName,
            String region,
            String country,
            BigDecimal priceMin,
            BigDecimal priceMax,
            String imageUrl,
            BigDecimal ratingAverage
    ) {
    }
}
