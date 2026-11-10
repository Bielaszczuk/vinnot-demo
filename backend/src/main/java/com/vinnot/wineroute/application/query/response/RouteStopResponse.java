package com.vinnot.wineroute.application.query.response;

import com.vinnot.wineroute.domain.model.RouteStop;

import java.math.BigDecimal;
import java.util.Objects;
import java.util.UUID;

/**
 * Response DTO for route stop.
 */
public record RouteStopResponse(
        UUID id,
        String name,
        String description,
        String type,
        String address,
        BigDecimal latitude,
        BigDecimal longitude,
        int stopOrder,
        Integer estimatedDuration
) {

    public static RouteStopResponse fromDomain(RouteStop stop) {
        BigDecimal lat = null;
        BigDecimal lng = null;

        if (Objects.nonNull(stop.getCoordinates())) {
            lat = stop.getCoordinates().getLatitude();
            lng = stop.getCoordinates().getLongitude();
        }

        return new RouteStopResponse(
                stop.getId(),
                stop.getName(),
                stop.getDescription(),
                stop.getType(),
                stop.getAddress(),
                lat,
                lng,
                stop.getStopOrder(),
                stop.getEstimatedDurationMinutes()
        );
    }
}

