package com.vinnot.review.application.query.response;

import com.vinnot.review.domain.model.PublicationStatus;

import java.time.Instant;
import java.util.UUID;

public record ReviewCommentResponse(
        UUID id,
        UUID reviewId,
        Instant createdAt,
        Instant updatedAt,
        String content,
        ReviewerInfo reviewer,
        PublicationStatus publicationStatus
) {

    public record ReviewerInfo(
            UUID id,
            String username,
            String displayName,
            String avatarUrl,
            String badgeTier
    ) {
        /** Commenter info without a seal (a locked or inactive member, or no points read). */
        public ReviewerInfo(UUID id, String username, String displayName, String avatarUrl) {
            this(id, username, displayName, avatarUrl, null);
        }
    }
}

