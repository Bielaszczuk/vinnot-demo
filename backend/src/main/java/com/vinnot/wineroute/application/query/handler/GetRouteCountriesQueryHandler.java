package com.vinnot.wineroute.application.query.handler;

import com.vinnot.wineroute.application.port.in.GetRouteCountriesUseCase;
import com.vinnot.wineroute.application.port.out.WineRouteRepositoryPort;
import com.vinnot.wineroute.application.query.model.GetRouteCountriesQuery;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import lombok.RequiredArgsConstructor;

/**
 * Handler for GetRouteCountriesQuery.
 */
@Service
@RequiredArgsConstructor
public class GetRouteCountriesQueryHandler implements GetRouteCountriesUseCase {

    private final WineRouteRepositoryPort repository;

    @Override
    @Transactional(readOnly = true)
    public List<String> execute(GetRouteCountriesQuery query) {
        return repository.findDistinctCountries();
    }
}

