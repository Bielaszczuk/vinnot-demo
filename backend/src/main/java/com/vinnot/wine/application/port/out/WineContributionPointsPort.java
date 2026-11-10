package com.vinnot.wine.application.port.out;

import java.util.UUID;

/** Points for catalogue contributions (#455), in the caller's transaction. */
public interface WineContributionPointsPort {
    /** A NEW wine submission was approved into the catalogue (by a moderator or automatically). */
    void submissionApproved(UUID submitterId, UUID submissionId, UUID wineId);

    /** A signed-in member's label scan matched one catalogue wine exactly. */
    void labelMatched(UUID userId, UUID wineId);
}
