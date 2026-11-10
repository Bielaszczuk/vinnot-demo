package com.vinnot.wineroute.infrastructure.persistence.mapper;

import com.vinnot.shared.domain.valueobject.Coordinates;
import com.vinnot.wineroute.domain.model.RouteStop;
import com.vinnot.wineroute.domain.model.WineRoute;
import com.vinnot.wineroute.domain.valueobject.RouteDifficulty;
import com.vinnot.wineroute.domain.valueobject.RouteStatus;
import com.vinnot.wineroute.infrastructure.persistence.entity.RouteStopJpaEntity;
import com.vinnot.wineroute.infrastructure.persistence.entity.WineRouteJpaEntity;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Mapper between WineRoute domain model and JPA entity.
 */
public final class WineRoutePersistenceMapper {

    private WineRoutePersistenceMapper() {
    }

    public static WineRoute toDomain(WineRouteJpaEntity entity) {
        if (Objects.isNull(entity)) {
            return null;
        }

        List<RouteStop> stops = entity.getStops().stream()
                .map(WineRoutePersistenceMapper::stopToDomain)
                .toList();

        RouteDifficulty difficulty = Objects.nonNull(entity.getDifficulty())
                ? RouteDifficulty.valueOf(entity.getDifficulty().name())
                : null;

        return WineRoute.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .country(entity.getCountry())
                .region(entity.getRegion())
                .subregion(entity.getSubregion())
                .estimatedDurationMinutes(entity.getEstimatedDurationMinutes())
                .estimatedDays(entity.getEstimatedDays())
                .totalDistanceKm(entity.getTotalDistanceKm())
                .difficulty(difficulty)
                .imageUrl(entity.getImageUrl())
                .status(RouteStatus.valueOf(entity.getStatus().name()))
                .recommendedWineTypes(entity.getRecommendedWineTypes())
                .mapEmbedUrl(entity.getMapEmbedUrl())
                .createdBy(entity.getCreatedBy())
                .stops(stops)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    /**
     * Maps entity to domain without accessing lazy-loaded stops.
     * Use for list/summary queries where stops are not needed.
     */
    public static WineRoute toDomainSummary(WineRouteJpaEntity entity) {
        if (Objects.isNull(entity)) {
            return null;
        }

        RouteDifficulty difficulty = Objects.nonNull(entity.getDifficulty())
                ? RouteDifficulty.valueOf(entity.getDifficulty().name())
                : null;

        return WineRoute.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .country(entity.getCountry())
                .region(entity.getRegion())
                .subregion(entity.getSubregion())
                .estimatedDurationMinutes(entity.getEstimatedDurationMinutes())
                .estimatedDays(entity.getEstimatedDays())
                .totalDistanceKm(entity.getTotalDistanceKm())
                .difficulty(difficulty)
                .imageUrl(entity.getImageUrl())
                .status(RouteStatus.valueOf(entity.getStatus().name()))
                .recommendedWineTypes(entity.getRecommendedWineTypes())
                .mapEmbedUrl(entity.getMapEmbedUrl())
                .createdBy(entity.getCreatedBy())
                .stops(new ArrayList<>())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public static RouteStop stopToDomain(RouteStopJpaEntity entity) {
        if (Objects.isNull(entity)) {
            return null;
        }

        Coordinates coordinates = null;
        if (Objects.nonNull(entity.getLatitude()) && Objects.nonNull(entity.getLongitude())) {
            coordinates = Coordinates.of(entity.getLatitude(), entity.getLongitude());
        }

        return RouteStop.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .type(entity.getType())
                .address(entity.getAddress())
                .coordinates(coordinates)
                .stopOrder(entity.getStopOrder())
                .estimatedDurationMinutes(entity.getEstimatedDurationMinutes())
                .build();
    }

    public static WineRouteJpaEntity toEntity(WineRoute route) {
        if (Objects.isNull(route)) {
            return null;
        }

        WineRouteJpaEntity entity = new WineRouteJpaEntity();
        entity.setId(route.getId());
        entity.setName(route.getName());
        entity.setDescription(route.getDescription());
        entity.setCountry(route.getCountry());
        entity.setRegion(route.getRegion());
        entity.setSubregion(route.getSubregion());
        entity.setEstimatedDurationMinutes(route.getEstimatedDurationMinutes());
        entity.setEstimatedDays(route.getEstimatedDays());
        entity.setTotalDistanceKm(route.getTotalDistanceKm());

        if (Objects.nonNull(route.getDifficulty())) {
            entity.setDifficulty(WineRouteJpaEntity.DifficultyEnum.valueOf(route.getDifficulty().name()));
        }

        entity.setImageUrl(route.getImageUrl());
        entity.setStatus(WineRouteJpaEntity.StatusEnum.valueOf(route.getStatus().name()));
        entity.setRecommendedWineTypes(new ArrayList<>(route.getRecommendedWineTypes()));
        entity.setMapEmbedUrl(route.getMapEmbedUrl());
        entity.setCreatedBy(route.getCreatedBy());
        entity.setCreatedAt(route.getCreatedAt());
        entity.setUpdatedAt(route.getUpdatedAt());

        List<RouteStopJpaEntity> stopEntities = route.getStops().stream()
                .map(stop -> stopToEntity(stop, route.getId()))
                .toList();
        entity.setStops(new ArrayList<>(stopEntities));

        return entity;
    }

    public static RouteStopJpaEntity stopToEntity(RouteStop stop, UUID routeId) {
        if (Objects.isNull(stop)) {
            return null;
        }

        RouteStopJpaEntity entity = new RouteStopJpaEntity();
        entity.setId(stop.getId());
        entity.setWineRouteId(routeId);
        entity.setName(stop.getName());
        entity.setDescription(stop.getDescription());
        entity.setType(stop.getType());
        entity.setAddress(stop.getAddress());

        if (Objects.nonNull(stop.getCoordinates())) {
            entity.setLatitude(stop.getCoordinates().getLatitude());
            entity.setLongitude(stop.getCoordinates().getLongitude());
        }

        entity.setStopOrder(stop.getStopOrder());
        entity.setEstimatedDurationMinutes(stop.getEstimatedDurationMinutes());

        return entity;
    }
}

