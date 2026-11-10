package com.vinnot.ai.domain.valueobject;

import java.util.Objects;
import java.util.UUID;

/** A stable identifier order for comparison cache keys. */
public record CanonicalWinePair(UUID wineAId, UUID wineBId) {

    public CanonicalWinePair {
        Objects.requireNonNull(wineAId, "wineAId is required");
        Objects.requireNonNull(wineBId, "wineBId is required");
    }

    public static CanonicalWinePair of(UUID requestedWineAId, UUID requestedWineBId) {
        Objects.requireNonNull(requestedWineAId, "requestedWineAId is required");
        Objects.requireNonNull(requestedWineBId, "requestedWineBId is required");
        return requestedWineAId.toString().compareTo(requestedWineBId.toString()) <= 0
                ? new CanonicalWinePair(requestedWineAId, requestedWineBId)
                : new CanonicalWinePair(requestedWineBId, requestedWineAId);
    }

    public boolean reverses(UUID requestedWineAId) {
        return !wineAId.equals(requestedWineAId);
    }
}
