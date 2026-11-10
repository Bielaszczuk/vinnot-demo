package com.vinnot.admin.application.port.out;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WineQueryPort {

    /**
     * Counts total wines.
     *
     * @return the total count
     */
    long count();

    /**
     * Finds wine data by ID.
     *
     * @param id the wine ID
     * @return the wine data if found
     */
    Optional<WineData> findById(UUID id);

    /**
     * Finds multiple wines by their IDs (batch lookup).
     *
     * @param ids the wine IDs
     * @return list of wine data
     */
    List<WineData> findAllByIds(Collection<UUID> ids);

    /**
     * Projected wine data needed by the admin module.
     */
    record WineData(UUID id, String name, Integer vintage) {
    }
}
