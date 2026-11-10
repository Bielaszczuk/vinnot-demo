package com.vinnot.review.application.port.out;

import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface ReviewLikeRepositoryPort {

    boolean existsByReviewIdAndUserId(UUID reviewId, UUID userId);

    void save(UUID reviewId, UUID userId);

    void deleteByReviewIdAndUserId(UUID reviewId, UUID userId);

    long countByReviewId(UUID reviewId);

    /** The members who like the review, in the order they liked it. */
    List<UUID> findUserIdsByReviewId(UUID reviewId);

    Set<UUID> findLikedReviewIdsByUserIdAndReviewIdIn(UUID userId, Collection<UUID> reviewIds);
}
