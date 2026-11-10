package com.vinnot.wineroute.application.command.handler;

import com.vinnot.shared.application.port.RouteDistanceService;
import com.vinnot.wineroute.application.command.model.CreateWineRouteCommand;
import com.vinnot.wineroute.application.port.in.CreateWineRouteUseCase;
import com.vinnot.wineroute.application.port.out.WineRouteRepositoryPort;
import com.vinnot.wineroute.domain.model.RouteStop;
import com.vinnot.wineroute.domain.model.WineRoute;
import com.vinnot.wineroute.domain.valueobject.RouteDifficulty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import com.vinnot.shared.application.media.CoverImageUseCase;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

/**
 * Handler for CreateWineRouteCommand.
 */
@Service
@RequiredArgsConstructor
public class CreateWineRouteCommandHandler implements CreateWineRouteUseCase {

    private static final Logger LOG = LoggerFactory.getLogger(CreateWineRouteCommandHandler.class);

    private final WineRouteRepositoryPort repository;
    private final CoverImageUseCase coverImages;
    private final RouteDistanceService distanceService;

    @Override
    @Transactional
    public UUID execute(CreateWineRouteCommand command) {
        WineRoute route = WineRoute.create(command.name(), command.createdBy());

        route.updateBasicInfo(
                command.name(),
                command.description(),
                command.country(),
                command.region(),
                command.subregion()
        );

        RouteDifficulty difficulty = Objects.nonNull(command.difficulty())
                ? RouteDifficulty.valueOf(command.difficulty().toUpperCase())
                : null;

        route.updateRouteDetails(
                command.estimatedDurationMinutes(),
                command.estimatedDays(),
                command.totalDistanceKm(),
                difficulty
        );

        route.updateImageUrl(coverImages.validateReference(command.imageUrl(), null, CoverImageUseCase.Kind.WINE_ROUTE));
        route.updateMapEmbedUrl(command.mapEmbedUrl());
        route.updateRecommendedWineTypes(command.recommendedWineTypes());

        // Add inline stops if provided
        if (Objects.nonNull(command.stops())) {
            int stopsTotal = 0;
            for (int i = 0; i < command.stops().size(); i++) {
                CreateWineRouteCommand.StopData stopData = command.stops().get(i);
                int order = stopData.stopOrder() > 0 ? stopData.stopOrder() : i + 1;
                RouteStop stop = RouteStop.create(
                        stopData.name(), stopData.description(), stopData.type(),
                        stopData.address(), stopData.latitude(), stopData.longitude(),
                        order, stopData.estimatedDuration()
                );
                route.addStop(stop);
                stopsTotal += Objects.nonNull(stopData.estimatedDuration())
                        ? stopData.estimatedDuration() : 0;
            }

            // Auto-compute total distance via Google Maps Directions API
            List<RouteDistanceService.LatLng> coords = route.getStops().stream()
                    .filter(s -> Objects.nonNull(s.getCoordinates())
                            && Objects.nonNull(s.getCoordinates().getLatitude())
                            && Objects.nonNull(s.getCoordinates().getLongitude()))
                    .map(s -> new RouteDistanceService.LatLng(
                            s.getCoordinates().getLatitude(),
                            s.getCoordinates().getLongitude()))
                    .toList();

            LOG.debug("Route has {} stops, {} with valid coordinates",
                    route.getStops().size(), coords.size());
            for (RouteStop rs : route.getStops()) {
                LOG.debug("Stop '{}': coords={}", rs.getName(),
                        Objects.nonNull(rs.getCoordinates()) ? rs.getCoordinates() : "null");
            }

            Double calculatedDistance = distanceService.calculateTotalDistanceKm(coords);

            Integer calculatedDuration = stopsTotal > 0
                    ? Integer.valueOf(stopsTotal)
                    : route.getEstimatedDurationMinutes();
            route.updateRouteDetails(
                    calculatedDuration,
                    route.getEstimatedDays(),
                    Objects.nonNull(calculatedDistance)
                            ? calculatedDistance : route.getTotalDistanceKm(),
                    route.getDifficulty()
            );
        }

        // Handle status: publish if requested and route has stops
        if (Objects.nonNull(command.status())) {
            switch (command.status().toLowerCase()) {
                case "active", "published" -> {
                    route.publish();
                }
                case "archived" -> route.archive();
                case "draft" -> { /* initial state */ }
                default -> throw new IllegalArgumentException("Unknown route status");
            }
        }

        WineRoute saved = repository.save(route);
        return saved.getId();
    }
}
