package com.vinnot.wineroute.application.query.response;

import com.vinnot.wineroute.domain.model.WineRoute;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Detailed response DTO for wine route detail views.
 */
public record WineRouteDetailsResponse(
        UUID id,
        String name,
        String description,
        String country,
        String region,
        String subregion,
        Integer estimatedDuration,
        Integer estimatedDays,
        Double totalDistance,
        String difficulty,
        String imageUrl,
        String mapEmbedUrl,
        String status,
        int wineryCount,
        int stopCount,
        List<String> recommendedWineTypes,
        List<RouteStopResponse> stops,
        List<RouteWineryInfo> wineries,
        UUID createdById,
        CreatedByInfo createdBy,
        Instant createdAt,
        Instant updatedAt
) {

    /**
     * Nested winery info for route detail.
     */
    public record RouteWineryInfo(
            UUID id,
            String name,
            String country,
            String region,
            String subregion,
            String description,
            String websiteUrl,
            String logoUrl,
            Integer established,
            String email,
            String phone,
            String address
    ) {
    }

    /**
     * Nested creator info for route detail.
     */
    public record CreatedByInfo(
            UUID id,
            String username,
            String name
    ) {
    }

    /**
     * Creates a WineRouteDetailsResponse from a domain model.
     *
     * @param route the domain model
     * @return the detail response
     */
    public static WineRouteDetailsResponse fromDomain(WineRoute route) {
        return fromDomainWithWineries(route, List.of());
    }

    /**
     * Creates a WineRouteDetailsResponse from a domain model with resolved winery info.
     *
     * @param route    the domain model
     * @param wineries the resolved winery info list
     * @return the detail response
     */
    public static WineRouteDetailsResponse fromDomainWithWineries(WineRoute route, List<RouteWineryInfo> wineries) {
        List<RouteStopResponse> stopResponses = route.getStops().stream()
                .map(RouteStopResponse::fromDomain)
                .toList();

        return new WineRouteDetailsResponse(
                route.getId(),
                route.getName(),
                route.getDescription(),
                route.getCountry(),
                route.getRegion(),
                route.getSubregion(),
                route.getEstimatedDurationMinutes(),
                route.getEstimatedDays(),
                route.getTotalDistanceKm(),
                Objects.nonNull(route.getDifficulty()) ? route.getDifficulty().name().toLowerCase() : null,
                route.getImageUrl(),
                route.getMapEmbedUrl(),
                WineRouteSummaryResponse.mapStatus(route.getStatus()),
                wineries.size(),
                route.getStopCount(),
                route.getRecommendedWineTypes(),
                stopResponses,
                wineries,
                route.getCreatedBy(),
                null,
                route.getCreatedAt(),
                route.getUpdatedAt()
        );
    }
}

