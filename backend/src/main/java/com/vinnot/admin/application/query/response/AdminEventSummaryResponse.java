package com.vinnot.admin.application.query.response;

import com.vinnot.admin.application.port.out.EventQueryPort;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AdminEventSummaryResponse(
        UUID id,
        String title,
        String type,
        Instant startDate,
        Instant endDate,
        String locationName,
        String locationCity,
        String locationRegion,
        String locationCountry,
        BigDecimal latitude,
        BigDecimal longitude,
        BigDecimal price,
        Integer maxAttendees,
        int currentAttendees,
        Integer availableSpots,
        String status,
        String imageUrl,
        UUID organizerId,
        String organizerName,
        Double distanceKm
) {

    /**
     * Creates an AdminEventSummaryResponse from an EventSummaryData projection.
     *
     * @param data the projected event data from the query port
     * @return the admin event summary response
     */
    public static AdminEventSummaryResponse fromData(EventQueryPort.EventSummaryData data) {
        return new AdminEventSummaryResponse(
                data.id(),
                data.title(),
                data.type(),
                data.startDate(),
                data.endDate(),
                data.locationName(),
                data.locationCity(),
                data.locationRegion(),
                data.locationCountry(),
                data.latitude(),
                data.longitude(),
                data.price(),
                data.maxAttendees(),
                data.currentAttendees(),
                data.availableSpots(),
                data.status(),
                data.imageUrl(),
                data.organizerId(),
                null,
                null
        );
    }
}
