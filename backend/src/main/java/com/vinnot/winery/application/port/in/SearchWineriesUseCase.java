package com.vinnot.winery.application.port.in;

import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.winery.application.query.model.SearchWineriesQuery;
import com.vinnot.winery.application.query.response.WinerySummaryResponse;

/**
 * Input port (driving) for searching wineries with filters.
 * Implemented by {@link com.vinnot.winery.application.query.handler.SearchWineriesQueryHandler}.
 */
public interface SearchWineriesUseCase {

    /**
     * Executes the search wineries query.
     *
     * @param query the search wineries query
     * @return a page of winery summaries
     */
    PageResult<WinerySummaryResponse> execute(SearchWineriesQuery query);
}

