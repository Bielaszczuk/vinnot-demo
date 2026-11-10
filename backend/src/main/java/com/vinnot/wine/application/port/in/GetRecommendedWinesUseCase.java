package com.vinnot.wine.application.port.in;

import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.query.model.GetRecommendedWinesQuery;
import com.vinnot.wine.application.query.response.WineSummaryResponse;

/**
 * Input port (driving) for retrieving recommended wines.
 * Implemented by {@link com.vinnot.wine.application.query.handler.GetRecommendedWinesQueryHandler}.
 */
public interface GetRecommendedWinesUseCase {

    /**
     * Executes the get recommended wines query.
     *
     * @param query the get recommended wines query
     * @return a page of recommended wine summaries
     */
    PageResult<WineSummaryResponse> execute(GetRecommendedWinesQuery query);
}
