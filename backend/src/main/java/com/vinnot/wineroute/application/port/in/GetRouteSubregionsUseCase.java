package com.vinnot.wineroute.application.port.in;

import com.vinnot.wineroute.application.query.model.GetRouteSubregionsQuery;

import java.util.List;

/**
 * Input port for getting subregions by country and region.
 */
public interface GetRouteSubregionsUseCase {

    List<String> execute(GetRouteSubregionsQuery query);
}

