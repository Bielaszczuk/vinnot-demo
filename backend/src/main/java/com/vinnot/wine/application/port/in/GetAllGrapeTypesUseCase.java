package com.vinnot.wine.application.port.in;

import com.vinnot.wine.application.query.model.GetAllGrapeTypesQuery;
import com.vinnot.wine.application.query.response.GrapeTypeResponse;

import java.util.List;

/**
 * Input port (driving) for retrieving all active grape types.
 * Implemented by {@link com.vinnot.wine.application.query.handler.GetAllGrapeTypesQueryHandler}.
 */
public interface GetAllGrapeTypesUseCase {

    /**
     * Executes the get all grape types query.
     *
     * @param query the get all grape types query
     * @return list of grape type responses
     */
    List<GrapeTypeResponse> execute(GetAllGrapeTypesQuery query);
}
