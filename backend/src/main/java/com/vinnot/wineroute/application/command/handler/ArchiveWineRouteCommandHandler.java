package com.vinnot.wineroute.application.command.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wineroute.application.command.model.ArchiveWineRouteCommand;
import com.vinnot.wineroute.application.port.in.ArchiveWineRouteUseCase;
import com.vinnot.wineroute.application.port.out.WineRouteRepositoryPort;
import com.vinnot.wineroute.domain.model.WineRoute;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

/**
 * Handler for ArchiveWineRouteCommand.
 */
@Service
@RequiredArgsConstructor
public class ArchiveWineRouteCommandHandler implements ArchiveWineRouteUseCase {

    private final WineRouteRepositoryPort repository;

    @Override
    @Transactional
    public void execute(ArchiveWineRouteCommand command) {
        WineRoute route = repository.findById(command.routeId())
                .orElseThrow(() -> new EntityNotFoundException("WineRoute", command.routeId()));
        route.archive();
        repository.save(route);
    }
}

