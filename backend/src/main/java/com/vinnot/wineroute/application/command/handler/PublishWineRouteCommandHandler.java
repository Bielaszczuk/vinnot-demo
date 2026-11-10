package com.vinnot.wineroute.application.command.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wineroute.application.command.model.PublishWineRouteCommand;
import com.vinnot.wineroute.application.port.in.PublishWineRouteUseCase;
import com.vinnot.wineroute.application.port.out.WineRouteRepositoryPort;
import com.vinnot.wineroute.domain.model.WineRoute;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

/**
 * Handler for PublishWineRouteCommand.
 */
@Service
@RequiredArgsConstructor
public class PublishWineRouteCommandHandler implements PublishWineRouteUseCase {

    private final WineRouteRepositoryPort repository;

    @Override
    @Transactional
    public void execute(PublishWineRouteCommand command) {
        WineRoute route = repository.findById(command.routeId())
                .orElseThrow(() -> new EntityNotFoundException("WineRoute", command.routeId()));
        route.publish();
        repository.save(route);
    }
}

