package com.vinnot.wineroute.application.port.in;

import com.vinnot.wineroute.application.query.model.GetRouteHierarchyQuery;
import com.vinnot.wineroute.application.query.response.RouteHierarchyResponse;

/**
 * Input port for getting the full route location hierarchy.
 */
public interface GetRouteHierarchyUseCase {

    RouteHierarchyResponse execute(GetRouteHierarchyQuery query);
}

