package com.vinnot.event.application.query.response;

import com.vinnot.event.domain.model.Event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public record EventSummaryResponse(
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
     * Creates an EventSummaryResponse from a domain model.
     *
     * @param event the domain model
     * @return the summary response
     */
    public static EventSummaryResponse fromDomain(Event event) {
        return fromDomainWithDistance(event, null);
    }

    /**
     * Creates an EventSummaryResponse from a domain model with distance.
     *
     * @param event      the domain model
     * @param distanceKm the distance in kilometers (nullable)
     * @return the summary response
     */
    public static EventSummaryResponse fromDomainWithDistance(Event event, Double distanceKm) {
        String locName = null;
        String city = null;
        String region = null;
        String country = null;
        BigDecimal lat = null;
        BigDecimal lng = null;
        if (Objects.nonNull(event.getLocation())) {
            locName = event.getLocation().getName();
            city = event.getLocation().getCity();
            region = event.getLocation().getRegion();
            country = event.getLocation().getCountry();
            if (event.getLocation().hasCoordinates()) {
                lat = event.getLocation().getCoordinates().getLatitude();
                lng = event.getLocation().getCoordinates().getLongitude();
            }
        }

        return new EventSummaryResponse(
                event.getId(),
                event.getTitle(),
                event.getEventType().name(),
                event.getDateRange().getStartDate(),
                event.getDateRange().getEndDate(),
                locName,
                city,
                region,
                country,
                lat,
                lng,
                event.getPrice(),
                event.getCapacity().getMaxAttendees(),
                event.getCapacity().getCurrentAttendees(),
                event.getCapacity().getAvailableSpots(),
                event.getStatus().name(),
                event.getImageUrl(),
                event.getOrganizerId(),
                null,
                distanceKm
        );
    }

}
