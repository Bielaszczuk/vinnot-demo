package com.vinnot.wine.application.port.in;

import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.query.model.GetFeaturedWinesQuery;
import com.vinnot.wine.application.query.response.WineSummaryResponse;

/**
 * Input port (driving) for retrieving featured wines.
 * Implemented by {@link com.vinnot.wine.application.query.handler.GetFeaturedWinesQueryHandler}.
 */
public interface GetFeaturedWinesUseCase {

    /**
     * Executes the get featured wines query.
     *
     * @param query the get featured wines query
     * @return a page of featured wine summaries
     */
    PageResult<WineSummaryResponse> execute(GetFeaturedWinesQuery query);
}
