package com.vinnot.wineroute.application.query.model;

import com.vinnot.shared.application.util.SearchInputLimits;

/**
 * Query to search all wine routes (admin, no status filter).
 */
public record SearchAllWineRoutesQuery(
        String searchTerm,
        int page,
        int size
) {
    public SearchAllWineRoutesQuery {
        SearchInputLimits.text(searchTerm);
    }
}
