package com.vinnot.wineroute.application.command.handler;

import com.vinnot.shared.application.port.RouteDistanceService;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wineroute.application.command.model.UpdateWineRouteCommand;
import com.vinnot.wineroute.application.port.in.UpdateWineRouteUseCase;
import com.vinnot.wineroute.application.port.out.WineRouteRepositoryPort;
import com.vinnot.wineroute.domain.model.RouteStop;
import com.vinnot.wineroute.domain.model.WineRoute;
import com.vinnot.wineroute.domain.valueobject.RouteDifficulty;
import org.springframework.stereotype.Service;
import com.vinnot.shared.application.media.CoverImageUseCase;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import com.vinnot.shared.application.command.FieldUpdates;
import lombok.RequiredArgsConstructor;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.wineroute.domain.valueobject.RouteStatus;

/**
 * Handler for UpdateWineRouteCommand.
 * Contains all business logic previously inlined in WineRouteAdminController.update().
 */
@Service
@RequiredArgsConstructor
public class UpdateWineRouteCommandHandler implements UpdateWineRouteUseCase {

    private final WineRouteRepositoryPort repository;
    private final CoverImageUseCase coverImages;
    private final RouteDistanceService distanceService;

    @Override
    @Transactional
    public void execute(UpdateWineRouteCommand command) {
        WineRoute route = repository.findById(command.routeId())
                .orElseThrow(() -> new EntityNotFoundException("WineRoute", command.routeId()));

        String previousImage = route.getImageUrl();
        String resolvedImage = coverImages.validateReference(command.imageUrl(), previousImage, CoverImageUseCase.Kind.WINE_ROUTE);

        FieldUpdates updates = new FieldUpdates(command.clearFields(), Set.of(
                "description", "region", "subregion", "estimatedDuration", "estimatedDays",
                "totalDistance", "imageUrl", "mapEmbedUrl", "difficulty"));
        updateBasicInfo(route, command, updates);
        updateRouteDetails(route, command, updates);
        updateOptionalFields(route, command, updates, resolvedImage);

        if (Objects.nonNull(command.stops())) {
            replaceStopsAndRecalculate(route, command.stops());
        }

        handleStatusChange(route, command.status());

        if (route.getStatus() == RouteStatus.PUBLISHED
                && route.getStops().isEmpty()) {
            throw new DomainException("CANNOT_PUBLISH", "A published route must have at least one stop");
        }
        repository.save(route);
        if (!Objects.equals(previousImage, route.getImageUrl())) { coverImages.reconcile(previousImage); }
    }

    private void updateBasicInfo(WineRoute route, UpdateWineRouteCommand command, FieldUpdates updates) {
        route.updateBasicInfo(
                Objects.nonNull(command.name()) ? command.name() : route.getName(),
                updates.resolve("description", command.description(), route.getDescription()),
                Objects.nonNull(command.country()) ? command.country() : route.getCountry(),
                updates.resolve("region", command.region(), route.getRegion()),
                updates.resolve("subregion", command.subregion(), route.getSubregion())
        );
    }

    private void updateRouteDetails(WineRoute route, UpdateWineRouteCommand command, FieldUpdates updates) {
        RouteDifficulty difficulty = updates.resolve("difficulty",
                Objects.isNull(command.difficulty()) ? null : RouteDifficulty.valueOf(command.difficulty().toUpperCase()),
                route.getDifficulty());
        route.updateRouteDetails(
                updates.resolve("estimatedDuration", command.estimatedDuration(), route.getEstimatedDurationMinutes()),
                updates.resolve("estimatedDays", command.estimatedDays(), route.getEstimatedDays()),
                updates.resolve("totalDistance", command.totalDistance(), route.getTotalDistanceKm()),
                difficulty
        );
    }

    private void updateOptionalFields(WineRoute route, UpdateWineRouteCommand command, FieldUpdates updates, String resolvedImage) {
        if (updates.changes("imageUrl", command.imageUrl())) {
            route.updateImageUrl(updates.resolve("imageUrl", resolvedImage, null));
        }
        if (updates.changes("mapEmbedUrl", command.mapEmbedUrl())) {
            route.updateMapEmbedUrl(updates.resolve("mapEmbedUrl", command.mapEmbedUrl(), null));
        }
        if (Objects.nonNull(command.recommendedWineTypes())) {
            route.updateRecommendedWineTypes(command.recommendedWineTypes());
        }
    }

    private void replaceStopsAndRecalculate(WineRoute route, List<UpdateWineRouteCommand.StopData> stopsData) {
        List<RouteStop> newStops = new ArrayList<>();
        for (int index = 0; index < stopsData.size(); index++) {
            UpdateWineRouteCommand.StopData stop = stopsData.get(index);
            int order = stop.stopOrder() > 0 ? stop.stopOrder() : index + 1;
            RouteStop routeStop = RouteStop.create(
                    stop.name(), stop.description(), stop.type(),
                    stop.address(), stop.latitude(), stop.longitude(),
                    order, stop.estimatedDuration()
            );
            newStops.add(routeStop);
        }
        route.replaceStops(newStops);

        // Auto-compute total duration from stops
        int stopsTotal = newStops.stream()
                .mapToInt(s -> Objects.nonNull(s.getEstimatedDurationMinutes())
                        ? s.getEstimatedDurationMinutes() : 0)
                .sum();

        // Auto-compute total distance via distance service
        List<RouteDistanceService.LatLng> coords = newStops.stream()
                .filter(s -> Objects.nonNull(s.getCoordinates())
                        && Objects.nonNull(s.getCoordinates().getLatitude())
                        && Objects.nonNull(s.getCoordinates().getLongitude()))
                .map(s -> new RouteDistanceService.LatLng(
                        s.getCoordinates().getLatitude(),
                        s.getCoordinates().getLongitude()))
                .toList();
        Double calculatedDistance = distanceService.calculateTotalDistanceKm(coords);

        Integer calculatedDuration = stopsTotal > 0
                ? Integer.valueOf(stopsTotal)
                : route.getEstimatedDurationMinutes();
        route.updateRouteDetails(
                calculatedDuration,
                route.getEstimatedDays(),
                Objects.nonNull(calculatedDistance) ? calculatedDistance : route.getTotalDistanceKm(),
                route.getDifficulty()
        );
    }

    private void handleStatusChange(WineRoute route, String status) {
        if (Objects.isNull(status)) {
            return;
        }
        switch (status.toLowerCase()) {
            case "active", "published" -> {
                route.publish();
            }
            case "archived" -> route.archive();
            case "draft" -> route.setToDraft();
            default -> throw new IllegalArgumentException("Unknown route status");
        }
    }
}
