package com.vinnot.wineroute.application.port.in;

import com.vinnot.wineroute.application.query.model.GetRouteRegionsQuery;

import java.util.List;

/**
 * Input port for getting regions by country.
 */
public interface GetRouteRegionsUseCase {

    List<String> execute(GetRouteRegionsQuery query);
}

