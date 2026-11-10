package com.vinnot.wineroute.application.query.response;

import com.vinnot.wineroute.domain.model.WineRoute;
import com.vinnot.wineroute.domain.valueobject.RouteStatus;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import com.vinnot.wineroute.application.port.out.WineRouteRepositoryPort;

/**
 * Summary response DTO for wine route list views.
 */
public record WineRouteSummaryResponse(
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
        Instant createdAt
) {

    /**
     * Maps domain RouteStatus to frontend-expected string.
     *
     * @param routeStatus the domain status
     * @return lowercase status string
     */
    public static String mapStatus(RouteStatus routeStatus) {
        return switch (routeStatus) {
            case PUBLISHED -> "active";
            case ARCHIVED -> "archived";
            default -> "draft";
        };
    }

    /**
     * Creates a WineRouteSummaryResponse from a domain model.
     *
     * @param route the domain model
     * @return the summary response
     */
    public static WineRouteSummaryResponse fromDomain(WineRoute route) {
        return fromDomain(route, new WineRouteRepositoryPort.StopCounts(
                route.getStopCount(), (int) route.getStops().stream().filter(s -> "winery".equalsIgnoreCase(s.getType())).count()));
    }

    public static WineRouteSummaryResponse fromDomain(WineRoute route,
            WineRouteRepositoryPort.StopCounts counts) {
        return new WineRouteSummaryResponse(
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
                mapStatus(route.getStatus()),
                counts.wineries(),
                counts.stops(),
                route.getCreatedAt()
        );
    }
}
