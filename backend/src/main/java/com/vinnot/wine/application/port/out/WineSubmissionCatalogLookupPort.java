package com.vinnot.wine.application.port.out;

import java.util.Optional;
import java.util.UUID;

/** Read-only catalog lookups used to link a submission to existing countries, regions, wineries and grapes. */
public interface WineSubmissionCatalogLookupPort {

    Optional<CatalogEntry> findCountry(UUID countryId);

    Optional<RegionEntry> findRegion(UUID regionId);

    Optional<CatalogEntry> findWinery(UUID wineryId);

    /** The single country whose name or code matches, ignoring case and accents. */
    Optional<CatalogEntry> matchCountry(String name);

    /** The single region of that country whose name matches, ignoring case and accents. */
    Optional<RegionEntry> matchRegion(UUID countryId, String name);

    /** The single winery whose name matches, ignoring case and accents; empty when none or several match. */
    Optional<CatalogEntry> matchWinery(String name);

    /** The catalog name of the active grape variety whose English or Spanish name matches. */
    Optional<String> matchGrape(String name);

    record CatalogEntry(UUID id, String name) {
    }

    record RegionEntry(UUID id, String name, UUID countryId) {
    }
}
