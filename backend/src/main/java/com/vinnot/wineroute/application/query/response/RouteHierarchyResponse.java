package com.vinnot.wineroute.application.query.response;

import java.util.List;
import java.util.Map;

/**
 * Response DTO for wine route hierarchy (countries -> regions -> subregions).
 */
public record RouteHierarchyResponse(
        Map<String, Map<String, List<String>>> hierarchy
) {
}

