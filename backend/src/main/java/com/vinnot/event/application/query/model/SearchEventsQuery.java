package com.vinnot.event.application.query.model;

import com.vinnot.shared.application.util.SearchInputLimits;

public record SearchEventsQuery(
        String searchTerm,
        String eventType,
        String city,
        String region,
        String country,
        int page,
        int size
) {
    public SearchEventsQuery {
        SearchInputLimits.text(searchTerm, eventType, city, region, country);
    }
}
