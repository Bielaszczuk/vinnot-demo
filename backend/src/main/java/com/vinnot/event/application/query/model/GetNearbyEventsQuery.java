package com.vinnot.event.application.query.model;

public record GetNearbyEventsQuery(
        double latitude,
        double longitude,
        double radiusKm,
        int page,
        int size
) {
}

