package com.vinnot.wineroute.application.query.handler;

import com.vinnot.wineroute.application.port.in.GetRouteSubregionsUseCase;
import com.vinnot.wineroute.application.port.out.WineRouteRepositoryPort;
import com.vinnot.wineroute.application.query.model.GetRouteSubregionsQuery;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import lombok.RequiredArgsConstructor;

/**
 * Handler for GetRouteSubregionsQuery.
 */
@Service
@RequiredArgsConstructor
public class GetRouteSubregionsQueryHandler implements GetRouteSubregionsUseCase {

    private final WineRouteRepositoryPort repository;

    @Override
    @Transactional(readOnly = true)
    public List<String> execute(GetRouteSubregionsQuery query) {
        return repository.findDistinctSubregionsByCountryAndRegion(query.country(), query.region());
    }
}

