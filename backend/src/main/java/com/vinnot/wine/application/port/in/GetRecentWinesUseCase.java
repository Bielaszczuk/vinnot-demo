package com.vinnot.wine.application.port.in;

import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.query.model.GetRecentWinesQuery;
import com.vinnot.wine.application.query.response.WineSummaryResponse;

/**
 * Input port (driving) for retrieving recently added wines.
 * Implemented by {@link com.vinnot.wine.application.query.handler.GetRecentWinesQueryHandler}.
 */
public interface GetRecentWinesUseCase {

    /**
     * Executes the get recent wines query.
     *
     * @param query the get recent wines query
     * @return a page of recent wine summaries
     */
    PageResult<WineSummaryResponse> execute(GetRecentWinesQuery query);
}
