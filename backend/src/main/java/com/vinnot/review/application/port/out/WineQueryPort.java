package com.vinnot.review.application.port.out;

import java.util.Optional;
import java.util.UUID;

public interface WineQueryPort {

    /**
     * Finds minimal wine data by ID.
     *
     * @param wineId the wine ID
     * @return the wine data if found
     */
    Optional<WineData> findById(UUID wineId);

    record WineData(
            UUID id,
            String name,
            Integer vintage
    ) {
    }
}
