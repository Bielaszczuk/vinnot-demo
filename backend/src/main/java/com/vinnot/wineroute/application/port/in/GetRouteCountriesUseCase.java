package com.vinnot.wineroute.application.port.in;

import com.vinnot.wineroute.application.query.model.GetRouteCountriesQuery;

import java.util.List;

/**
 * Input port for getting all countries with wine routes.
 */
public interface GetRouteCountriesUseCase {

    List<String> execute(GetRouteCountriesQuery query);
}

