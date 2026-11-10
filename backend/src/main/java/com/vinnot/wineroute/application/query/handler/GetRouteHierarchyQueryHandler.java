package com.vinnot.wineroute.application.query.handler;

import com.vinnot.wineroute.application.port.in.GetRouteHierarchyUseCase;
import com.vinnot.wineroute.application.port.out.WineRouteRepositoryPort;
import com.vinnot.wineroute.application.query.model.GetRouteHierarchyQuery;
import com.vinnot.wineroute.application.query.response.RouteHierarchyResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;

/**
 * Handler for GetRouteHierarchyQuery.
 */
@Service
@RequiredArgsConstructor
public class GetRouteHierarchyQueryHandler implements GetRouteHierarchyUseCase {

    private final WineRouteRepositoryPort repository;

    @Override
    @Transactional(readOnly = true)
    public RouteHierarchyResponse execute(GetRouteHierarchyQuery query) {
        Map<String, Map<String, List<String>>> hierarchy = new HashMap<>();

        List<String> countries = repository.findDistinctCountries();
        for (String country : countries) {
            Map<String, List<String>> regionsMap = new HashMap<>();

            List<String> regions = repository.findDistinctRegionsByCountry(country);
            for (String region : regions) {
                List<String> subregions = repository.findDistinctSubregionsByCountryAndRegion(country, region);
                regionsMap.put(region, Objects.nonNull(subregions) ? subregions : new ArrayList<>());
            }

            hierarchy.put(country, regionsMap);
        }

        return new RouteHierarchyResponse(hierarchy);
    }
}

