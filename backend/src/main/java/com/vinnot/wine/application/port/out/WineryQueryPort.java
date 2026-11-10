package com.vinnot.wine.application.port.out;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WineryQueryPort {

    /**
     * Finds winery data by ID.
     *
     * @param id the winery ID
     * @return the winery data if found
     */
    Optional<WineryData> findById(UUID id);

    /**
     * Finds winery data by a collection of IDs (batch lookup).
     *
     * @param ids the winery IDs
     * @return list of found winery data
     */
    List<WineryData> findAllByIds(List<UUID> ids);

    /**
     * Read-only projection of winery data needed by wine query handlers.
     * Defined here as part of the port contract — not a domain entity.
     */
    record WineryData(
            UUID id,
            String name,
            String countryName,
            String regionName,
            String subregion,
            String descriptionEs,
            String websiteUrl,
            String contactEmail,
            String contactPhone,
            String address,
            BigDecimal latitude,
            BigDecimal longitude,
            String logoUrl,
            Integer establishedYear
    ) {
    }
}
