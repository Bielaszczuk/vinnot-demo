package com.vinnot.wineroute.application.query.handler;

import com.vinnot.wineroute.application.port.in.GetRouteRegionsUseCase;
import com.vinnot.wineroute.application.port.out.WineRouteRepositoryPort;
import com.vinnot.wineroute.application.query.model.GetRouteRegionsQuery;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import lombok.RequiredArgsConstructor;

/**
 * Handler for GetRouteRegionsQuery.
 */
@Service
@RequiredArgsConstructor
public class GetRouteRegionsQueryHandler implements GetRouteRegionsUseCase {

    private final WineRouteRepositoryPort repository;

    @Override
    @Transactional(readOnly = true)
    public List<String> execute(GetRouteRegionsQuery query) {
        return repository.findDistinctRegionsByCountry(query.country());
    }
}

