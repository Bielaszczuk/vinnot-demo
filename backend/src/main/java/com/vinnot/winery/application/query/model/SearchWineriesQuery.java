package com.vinnot.winery.application.query.model;

import com.vinnot.shared.application.util.SearchInputLimits;

import com.vinnot.shared.application.query.Query;
import com.vinnot.winery.application.query.response.WinerySummaryResponse;
import com.vinnot.shared.domain.valueobject.PageResult;

/**
 * Query to search wineries with filters.
 *
 * @param searchTerm the search term
 * @param country    the country filter
 * @param region     the region filter
 * @param page       the page number
 * @param size       the page size
 */
public record SearchWineriesQuery(
        String searchTerm,
        String country,
        String region,
        int page,
        int size
) implements Query<PageResult<WinerySummaryResponse>> {
    public SearchWineriesQuery {
        SearchInputLimits.text(searchTerm, country, region);
    }
}
