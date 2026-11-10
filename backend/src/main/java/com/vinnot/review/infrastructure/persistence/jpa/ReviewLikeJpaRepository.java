package com.vinnot.review.infrastructure.persistence.jpa;

import com.vinnot.review.infrastructure.persistence.entity.ReviewLikeJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Repository
public interface ReviewLikeJpaRepository extends JpaRepository<ReviewLikeJpaEntity, UUID> {

    Optional<ReviewLikeJpaEntity> findByReviewIdAndUserId(UUID reviewId, UUID userId);

    boolean existsByReviewIdAndUserId(UUID reviewId, UUID userId);

    void deleteByReviewIdAndUserId(UUID reviewId, UUID userId);

    long countByReviewId(UUID reviewId);

    @Query("SELECT rl.userId FROM ReviewLikeJpaEntity rl WHERE rl.reviewId = :reviewId ORDER BY rl.createdAt, rl.id")
    List<UUID> findUserIdsByReviewId(@Param("reviewId") UUID reviewId);

    /**
     * Finds the set of review IDs that a given user has liked, filtered to a collection of review IDs.
     *
     * @param userId    the user ID
     * @param reviewIds the review IDs to check
     * @return the set of liked review IDs
     */
    @Query("SELECT rl.reviewId FROM ReviewLikeJpaEntity rl WHERE rl.userId = :userId AND rl.reviewId IN :reviewIds")
    Set<UUID> findLikedReviewIdsByUserIdAndReviewIdIn(@Param("userId") UUID userId,
                                                       @Param("reviewIds") Collection<UUID> reviewIds);
}

