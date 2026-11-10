package com.vinnot.review.application.command.model;

import java.util.UUID;

public record DeleteReviewCommentCommand(
        UUID commentId,
        UUID requestingUserId,
        boolean administrator,
        String reportReason
) {
    /** A removal without a report behind it. */
    public DeleteReviewCommentCommand(UUID commentId, UUID requestingUserId, boolean administrator) {
        this(commentId, requestingUserId, administrator, null);
    }
}
