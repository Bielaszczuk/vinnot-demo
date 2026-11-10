package com.vinnot.review.application.query.response;

import com.vinnot.review.application.port.out.ReviewPublicationRepositoryPort.PublicationNames;
import com.vinnot.review.domain.model.PublicationStatus;
import com.vinnot.review.domain.model.ReviewPublication;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * A pending publication as moderators see it: every publication field plus the author's username
 * and the wine's name, each null when that user or wine was deleted or is missing.
 */
public record ReviewPublicationQueueItem(
        ReviewPublication.Type type,
        UUID id,
        UUID wineId,
        UUID reviewId,
        UUID authorId,
        BigDecimal rating,
        String title,
        String content,
        PublicationStatus status,
        Instant createdAt,
        Instant updatedAt,
        boolean parentApproved,
        String authorUsername,
        String wineName) {
    public static ReviewPublicationQueueItem from(
            ReviewPublication publication, PublicationNames names) {
        return new ReviewPublicationQueueItem(
                publication.type(),
                publication.id(),
                publication.wineId(),
                publication.reviewId(),
                publication.authorId(),
                publication.rating(),
                publication.title(),
                publication.content(),
                publication.status(),
                publication.createdAt(),
                publication.updatedAt(),
                publication.parentApproved(),
                names.authors().get(publication.authorId()),
                names.wines().get(publication.wineId()));
    }
}
