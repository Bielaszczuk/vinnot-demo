package com.vinnot.event.application.query.model;

import com.vinnot.shared.domain.valueobject.ResourceReader;

import java.util.Objects;
import java.util.UUID;

public record GetEventByIdQuery(UUID eventId, ResourceReader reader) {
    public GetEventByIdQuery(UUID eventId) {
        this(eventId, ResourceReader.anonymous());
    }

    public GetEventByIdQuery {
        Objects.requireNonNull(reader, "Reader context is required");
    }
}
