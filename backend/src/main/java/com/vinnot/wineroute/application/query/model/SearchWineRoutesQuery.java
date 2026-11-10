package com.vinnot.wineroute.application.query.model;

import com.vinnot.shared.application.util.SearchInputLimits;
import com.vinnot.wineroute.domain.valueobject.RouteDifficulty;

/**
 * Query to search published wine routes. A null filter does not restrict the results.
 */
public record SearchWineRoutesQuery(
        String searchTerm,
        String country,
        String region,
        RouteDifficulty difficulty,
        int page,
        int size
) {
    public SearchWineRoutesQuery {
        SearchInputLimits.text(searchTerm, country, region);
    }
}
