package com.vinnot.event.application.query.model;

import com.vinnot.shared.application.util.SearchInputLimits;

import java.util.UUID;

/**
 * Query for the events an organizer owns, newest first.
 * A null or blank search term lists every own event.
 */
public record GetMyEventsQuery(
        UUID organizerId,
        String searchTerm,
        int page,
        int size
) {
    public GetMyEventsQuery {
        SearchInputLimits.text(searchTerm);
    }

    public GetMyEventsQuery(UUID organizerId, int page, int size) {
        this(organizerId, null, page, size);
    }
}
