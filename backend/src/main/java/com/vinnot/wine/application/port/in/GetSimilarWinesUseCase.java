package com.vinnot.wine.application.port.in;

import com.vinnot.wine.application.query.model.GetSimilarWinesQuery;
import com.vinnot.wine.application.query.response.WineSummaryResponse;

import java.util.List;

/**
 * Input port (driving) for retrieving wines similar to a given wine.
 * Implemented by {@link com.vinnot.wine.application.query.handler.GetSimilarWinesQueryHandler}.
 */
public interface GetSimilarWinesUseCase {

    /**
     * Executes the get similar wines query.
     *
     * @param query the get similar wines query
     * @return list of similar wine summaries
     */
    List<WineSummaryResponse> execute(GetSimilarWinesQuery query);
}
