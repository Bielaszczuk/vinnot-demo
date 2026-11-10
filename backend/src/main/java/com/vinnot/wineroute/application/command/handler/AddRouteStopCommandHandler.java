package com.vinnot.wineroute.application.command.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.valueobject.Coordinates;
import com.vinnot.wineroute.application.command.model.AddRouteStopCommand;
import com.vinnot.wineroute.application.port.in.AddRouteStopUseCase;
import com.vinnot.wineroute.application.port.out.WineRouteRepositoryPort;
import com.vinnot.wineroute.domain.model.RouteStop;
import com.vinnot.wineroute.domain.model.WineRoute;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

/**
 * Handler for AddRouteStopCommand.
 */
@Service
@RequiredArgsConstructor
public class AddRouteStopCommandHandler implements AddRouteStopUseCase {

    private final WineRouteRepositoryPort repository;

    @Override
    @Transactional
    public UUID execute(AddRouteStopCommand command) {
        WineRoute route = repository.findById(command.routeId())
                .orElseThrow(() -> new EntityNotFoundException("WineRoute", command.routeId()));

        if (!command.administrator() && !route.getCreatedBy().equals(command.requestingUserId())) {
            throw new BusinessRuleViolationException(
                    "WINE_ROUTE_OWNERSHIP",
                    "You can only add stops to wine routes that you created");
        }

        RouteStop stop = RouteStop.create(command.name(), command.stopOrder());
        stop.updateDetails(command.name(), command.description(), command.type(), command.address());

        if (Objects.nonNull(command.latitude()) && Objects.nonNull(command.longitude())) {
            Coordinates coordinates = Coordinates.of(command.latitude(), command.longitude());
            stop.updateCoordinates(coordinates);
        }

        stop.updateDuration(command.estimatedDurationMinutes());
        route.addStop(stop);
        repository.save(route);

        return stop.getId();
    }
}
