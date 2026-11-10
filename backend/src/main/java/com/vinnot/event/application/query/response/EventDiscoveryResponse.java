package com.vinnot.event.application.query.response;

import com.vinnot.shared.domain.valueobject.PageResult;

public record EventDiscoveryResponse(
        double radiusKm,
        boolean nearbyEventsFound,
        String message,
        PageResult<EventSummaryResponse> nearbyEvents,
        PageResult<EventSummaryResponse> otherEvents
) {
}
