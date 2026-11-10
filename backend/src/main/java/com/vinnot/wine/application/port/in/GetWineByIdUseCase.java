package com.vinnot.wine.application.port.in;

import com.vinnot.wine.application.query.model.GetWineByIdQuery;
import com.vinnot.wine.application.query.response.WineDetailsResponse;

/**
 * Input port (driving) for retrieving wine details by ID.
 * Implemented by {@link com.vinnot.wine.application.query.handler.GetWineByIdQueryHandler}.
 */
public interface GetWineByIdUseCase {

    /**
     * Executes the get wine by ID query.
     *
     * @param query the get wine by ID query
     * @return the wine details
     */
    WineDetailsResponse execute(GetWineByIdQuery query);
}
