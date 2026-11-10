package com.vinnot.wineroute.application.port.out;

import java.util.List;
import java.util.UUID;

/**
 * Output port for read-only queries toward the winery module.
 * Encapsulates the cross-module boundary so that wineroute.application
 * never imports winery domain models or winery output ports directly.
 */
public interface WineryQueryPort {

    /**
     * Projected winery detail data needed by wineroute.
     */
    record WineryDetailData(
            UUID id,
            String name,
            String country,
            String region,
            String subregion,
            String description,
            String websiteUrl,
            String logoUrl,
            Integer established,
            String email,
            String phone,
            String address
    ) {
    }

    /**
     * Resolves active wineries by exact, case-insensitive names in one batch.
     *
     * @param names winery stop names; missing names are omitted
     * @return matching winery details, without catalogue search or total counts
     */
    List<WineryDetailData> findByExactNames(List<String> names);
}
