package com.vinnot.wine.application.query.model;

import com.vinnot.shared.application.query.Query;
import com.vinnot.shared.domain.valueobject.ResourceReader;
import com.vinnot.wine.application.query.response.WineDetailsResponse;

import java.util.Objects;
import java.util.UUID;

/**
 * Query to get wine details by ID.
 *
 * @param wineId the wine ID
 */
public record GetWineByIdQuery(UUID wineId, ResourceReader reader) implements Query<WineDetailsResponse> {
    public GetWineByIdQuery(UUID wineId) {
        this(wineId, ResourceReader.anonymous());
    }

    public GetWineByIdQuery {
        Objects.requireNonNull(reader, "Reader context is required");
    }
}
