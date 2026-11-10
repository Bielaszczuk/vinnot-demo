package com.vinnot.review.application.query.model;

import java.util.UUID;

public record GetReviewCommentsQuery(UUID reviewId, UUID viewerId) {
    public GetReviewCommentsQuery(UUID reviewId) { this(reviewId, null); }
}

