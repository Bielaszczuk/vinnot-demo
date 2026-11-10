package com.vinnot.admin.infrastructure.persistence.adapter;

import com.vinnot.admin.application.port.out.WineRouteQueryPort;
import com.vinnot.wineroute.application.port.out.WineRouteRepositoryPort;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;

@Component("adminWineRouteQueryAdapter")
@RequiredArgsConstructor
public class WineRouteQueryAdapter implements WineRouteQueryPort {

    private final WineRouteRepositoryPort routeRepository;

    @Override
    public long count() {
        return routeRepository.count();
    }

    @Override
    public long countPublished() {
        return routeRepository.countPublished();
    }
}

