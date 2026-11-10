package com.vinnot.wineroute.application.command.model;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.Set;

/**
 * Command to update an existing wine route.
 */
public record UpdateWineRouteCommand(
        UUID routeId,
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
        List<String> recommendedWineTypes,
        List<StopData> stops,
        String status,
        Set<String> clearFields
) {
    public UpdateWineRouteCommand(UUID routeId,
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
            List<String> recommendedWineTypes,
            List<StopData> stops,
            String status) {
        this(routeId, name, description, country, region, subregion, estimatedDuration, estimatedDays, totalDistance, difficulty, imageUrl, mapEmbedUrl, recommendedWineTypes, stops, status, Set.of());
    }


    /**
     * Stop data included in the update command.
     */
    public record StopData(
            String name,
            String description,
            String type,
            String address,
            BigDecimal latitude,
            BigDecimal longitude,
            int stopOrder,
            Integer estimatedDuration
    ) {
    }
}
