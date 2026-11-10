package com.vinnot.wine.application.port.in;

import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.query.model.GetTopRatedWinesQuery;
import com.vinnot.wine.application.query.response.WineSummaryResponse;

/**
 * Input port (driving) for retrieving top rated wines.
 * Implemented by {@link com.vinnot.wine.application.query.handler.GetTopRatedWinesQueryHandler}.
 */
public interface GetTopRatedWinesUseCase {

    /**
     * Executes the get top rated wines query.
     *
     * @param query the get top rated wines query
     * @return a page of top rated wine summaries
     */
    PageResult<WineSummaryResponse> execute(GetTopRatedWinesQuery query);
}
