package com.vinnot.wine.application.port.out;

import java.util.Optional;
import java.util.UUID;

/**
 * Cross-module catalog resolution required to publish an approved submission.
 * Its adapter contains all winery/region persistence knowledge.
 */
public interface WineCatalogReferencePort {

    default Optional<CatalogReference> resolveOrCreate(
            String wineryName, String countryName, String regionName) {
        return resolveOrCreate(new CatalogSelection(null, wineryName, null, countryName, null, regionName));
    }

    /** Picked IDs win over names; a missing or stale ID falls back to matching its name. */
    Optional<CatalogReference> resolveOrCreate(CatalogSelection selection);

    record CatalogSelection(
            UUID wineryId, String wineryName,
            UUID countryId, String countryName,
            UUID regionId, String regionName
    ) {
    }

    record CatalogReference(
            UUID wineryId,
            String wineryName,
            UUID countryId,
            String countryName,
            UUID regionId,
            String regionName
    ) {
    }
}
