package com.vinnot.event.application.query.model;

public record DiscoverEventsQuery(
        double latitude,
        double longitude,
        double radiusKm,
        int page,
        int size
) {
}
