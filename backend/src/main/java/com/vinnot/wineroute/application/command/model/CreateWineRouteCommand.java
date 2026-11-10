package com.vinnot.wineroute.application.command.model;

import java.util.List;
import java.util.UUID;
import java.math.BigDecimal;

/**
 * Command to create a new wine route.
 */
public record CreateWineRouteCommand(
        String name,
        String description,
        String country,
        String region,
        String subregion,
        Integer estimatedDurationMinutes,
        Integer estimatedDays,
        Double totalDistanceKm,
        String difficulty,
        String imageUrl,
        List<String> recommendedWineTypes,
        String mapEmbedUrl,
        UUID createdBy,
        String status,
        List<StopData> stops
) {

    /**
     * Stop data included in the create command.
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

