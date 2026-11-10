package com.vinnot.wineroute.application.query.model;

import com.vinnot.shared.domain.valueobject.ResourceReader;

import java.util.Objects;
import java.util.UUID;

/**
 * Query to get wine route details by ID.
 */
public record GetWineRouteByIdQuery(UUID routeId, ResourceReader reader) {
    public GetWineRouteByIdQuery(UUID routeId) {
        this(routeId, ResourceReader.anonymous());
    }

    public GetWineRouteByIdQuery {
        Objects.requireNonNull(reader, "Reader context is required");
    }
}
