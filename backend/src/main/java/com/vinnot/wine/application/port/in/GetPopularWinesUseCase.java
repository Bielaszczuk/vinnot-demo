package com.vinnot.wine.application.port.in;

import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.query.model.GetPopularWinesQuery;
import com.vinnot.wine.application.query.response.WineSummaryResponse;

/**
 * Input port (driving) for retrieving popular wines.
 * Implemented by {@link com.vinnot.wine.application.query.handler.GetPopularWinesQueryHandler}.
 */
public interface GetPopularWinesUseCase {

    /**
     * Executes the get popular wines query.
     *
     * @param query the get popular wines query
     * @return a page of popular wine summaries
     */
    PageResult<WineSummaryResponse> execute(GetPopularWinesQuery query);
}
