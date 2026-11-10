package com.vinnot.wineroute.application.port.in;

import com.vinnot.wineroute.application.query.model.GetWineRouteByIdQuery;
import com.vinnot.wineroute.application.query.response.WineRouteDetailsResponse;

/**
 * Input port for getting a wine route by ID.
 */
public interface GetWineRouteByIdUseCase {

    WineRouteDetailsResponse execute(GetWineRouteByIdQuery query);
}

