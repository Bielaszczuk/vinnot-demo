package com.vinnot.review.application.command.model;

import java.util.UUID;

public record DeleteReviewCommand(
        UUID reviewId,
        UUID requestingUserId,
        boolean administrator,
        String reportReason
) {
    /** A removal without a report behind it. */
    public DeleteReviewCommand(UUID reviewId, UUID requestingUserId, boolean administrator) {
        this(reviewId, requestingUserId, administrator, null);
    }
}
