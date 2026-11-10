package com.vinnot.cellar.application.port.out;

import java.util.UUID;

/** Points for adding a wine to the cellar by hand (#455): once per wine ever, in the caller's transaction. */
public interface CellarPointsPort {
    void wineAddedByHand(UUID userId, UUID wineId);
}
