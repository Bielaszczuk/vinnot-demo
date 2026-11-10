package com.vinnot.wine.domain.model;

import java.util.UUID;

/**
 * Catalog candidate enriched with the winery name required by the matcher.
 */
public record WineLabelCandidate(
        Wine wine,
        String wineryName
) {

    public UUID id() {
        return wine.getId();
    }
}
