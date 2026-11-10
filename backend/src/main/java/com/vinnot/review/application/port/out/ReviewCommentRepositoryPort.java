package com.vinnot.review.application.port.out;

import com.vinnot.review.domain.model.PublicationStatus;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.time.Instant;

public interface ReviewCommentRepositoryPort {

    Optional<ReviewCommentData> findById(UUID id);

    List<ReviewCommentData> findByReviewIdOrderByCreatedAtAsc(UUID reviewId);

    List<ReviewCommentData> findVisibleByReviewId(UUID reviewId, UUID viewerId);

    long countByReviewId(UUID reviewId);

    /** Counts comments for all requested reviews in one grouped query. */
    Map<UUID, Long> countByReviewIds(Collection<UUID> reviewIds);

    /** Stores a new comment with the given publication status and returns its id. */
    UUID save(UUID reviewId, UUID userId, String content, PublicationStatus status);

    void delete(UUID commentId);

    record ReviewCommentData(
            UUID id,
            UUID reviewId,
            UUID userId,
            String content,
            Instant createdAt,
            Instant updatedAt,
            PublicationStatus publicationStatus
    ) {
        public ReviewCommentData(UUID id, UUID reviewId, UUID userId, String content, Instant createdAt, Instant updatedAt) {
            this(id, reviewId, userId, content, createdAt, updatedAt, PublicationStatus.APPROVED);
        }
    }
}
