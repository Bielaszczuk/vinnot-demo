package com.vinnot.wine.application.port.in;

import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.query.model.SearchWinesQuery;
import com.vinnot.wine.application.query.response.WineSummaryResponse;

/**
 * Input port (driving) for searching wines with filters.
 * Implemented by {@link com.vinnot.wine.application.query.handler.SearchWinesQueryHandler}.
 */
public interface SearchWinesUseCase {

    /**
     * Executes the search wines query.
     *
     * @param query the search wines query
     * @return a page of wine summaries
     */
    PageResult<WineSummaryResponse> execute(SearchWinesQuery query);
}
