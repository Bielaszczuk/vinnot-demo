package com.vinnot.wineroute.application.command.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wineroute.application.command.model.DeleteWineRouteCommand;
import com.vinnot.wineroute.application.port.in.DeleteWineRouteUseCase;
import com.vinnot.wineroute.application.port.out.WineRouteRepositoryPort;
import com.vinnot.wineroute.domain.model.WineRoute;
import org.springframework.stereotype.Service;
import com.vinnot.shared.application.media.CoverImageUseCase;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

/**
 * Handler for DeleteWineRouteCommand.
 */
@Service
@RequiredArgsConstructor
public class DeleteWineRouteCommandHandler implements DeleteWineRouteUseCase {

    private final WineRouteRepositoryPort repository;
    private final CoverImageUseCase coverImages;

    @Override
    @Transactional
    public void execute(DeleteWineRouteCommand command) {
        WineRoute route = repository.findById(command.routeId())
                .orElseThrow(() -> new EntityNotFoundException("WineRoute", command.routeId()));
        repository.delete(route);
        coverImages.reconcile(route.getImageUrl());
    }
}

