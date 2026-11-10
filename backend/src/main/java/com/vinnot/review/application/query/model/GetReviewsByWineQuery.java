package com.vinnot.review.application.query.model;

import java.util.UUID;

public record GetReviewsByWineQuery(UUID wineId, int page, int size, String filter, UUID currentUserId) {

    public GetReviewsByWineQuery(UUID wineId, int page, int size) {
        this(wineId, page, size, "recent", null);
    }

    public GetReviewsByWineQuery(UUID wineId, int page, int size, String filter) {
        this(wineId, page, size, filter, null);
    }
}

