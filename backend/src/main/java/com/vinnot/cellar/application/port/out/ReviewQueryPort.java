package com.vinnot.cellar.application.port.out;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;

/** Current cellar owner's review identifiers, loaded in one bounded batch. */
public interface ReviewQueryPort {
    Map<UUID, UUID> findReviewIds(UUID userId, Collection<UUID> wineIds);
}
