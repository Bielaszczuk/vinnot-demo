package com.vinnot.wine.application.port.out;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Read-only projection of existing profiles; never generates content or changes catalog data. */
public interface WineProfileOverviewPort {
    Map<String, Overview> findByWineId(UUID wineId);

    record Overview(String summary, Integer acidityScore, Integer tanninScore,
                    Integer bodyScore, Integer sweetnessScore, List<String> foodPairings) {
    }
}
