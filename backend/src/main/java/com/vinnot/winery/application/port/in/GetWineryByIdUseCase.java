package com.vinnot.winery.application.port.in;

import com.vinnot.winery.application.query.model.GetWineryByIdQuery;
import com.vinnot.winery.application.query.response.WineryDetailsResponse;

/**
 * Input port (driving) for retrieving winery details by ID.
 * Implemented by {@link com.vinnot.winery.application.query.handler.GetWineryByIdQueryHandler}.
 */
public interface GetWineryByIdUseCase {

    /**
     * Executes the get winery by ID query.
     *
     * @param query the get winery by ID query
     * @return the winery details
     */
    WineryDetailsResponse execute(GetWineryByIdQuery query);
}

