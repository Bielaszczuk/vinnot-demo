package com.vinnot.wine.application.port.out;

import java.util.UUID;

/**
 * Signals a possible catalog problem found while scanning, so moderators can review it. Catalog data is never
 * changed by a signal; the receiver turns it into a moderation report.
 */
public interface CatalogQualitySignalPort {

    /**
     * A member said an exact scan match was the wrong wine and picked another one instead: the two rows may be
     * duplicates, or one may have the wrong winery or image.
     *
     * @param matchedWineId the wine the scan returned as exact
     * @param chosenWineId  the wine the member picked instead
     */
    void exactMatchCorrected(UUID matchedWineId, UUID chosenWineId);
}
