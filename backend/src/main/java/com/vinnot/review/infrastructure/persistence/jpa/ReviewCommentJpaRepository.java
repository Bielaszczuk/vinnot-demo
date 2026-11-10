package com.vinnot.review.infrastructure.persistence.jpa;

import com.vinnot.review.infrastructure.persistence.entity.ReviewCommentJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface ReviewCommentJpaRepository extends JpaRepository<ReviewCommentJpaEntity, UUID> {

    /**
     * Finds comments by review ID.
     *
     * @param reviewId the review ID
     * @return list of comments
     */
    List<ReviewCommentJpaEntity> findByReviewIdOrderByCreatedAtAsc(UUID reviewId);

    /**
     * Counts comments for a review.
     *
     * @param reviewId the review ID
     * @return the count
     */
    @Query("SELECT c FROM ReviewCommentJpaEntity c, ReviewJpaEntity r WHERE c.reviewId=:reviewId AND r.id=c.reviewId "
            + "AND (r.publicationStatus='APPROVED' OR r.userId=:viewerId) "
            + "AND (c.publicationStatus='APPROVED' OR c.userId=:viewerId) AND NOT EXISTS "
            + "(SELECT b.id FROM UserBlockJpaEntity b WHERE "
            + "(b.blockerId=:viewerId AND (b.blockedId=c.userId OR b.blockedId=r.userId)) OR "
            + "(b.blockedId=:viewerId AND (b.blockerId=c.userId OR b.blockerId=r.userId))) ORDER BY c.createdAt,c.id")
    List<ReviewCommentJpaEntity> findVisibleByReviewId(UUID reviewId, UUID viewerId);

    @Query("SELECT COUNT(c) FROM ReviewCommentJpaEntity c WHERE c.reviewId=:reviewId AND c.publicationStatus='APPROVED'")
    long countByReviewId(UUID reviewId);

    @Query("SELECT comment.reviewId AS id, COUNT(comment.id) AS total "
            + "FROM ReviewCommentJpaEntity comment "
            + "WHERE comment.reviewId IN :reviewIds AND comment.publicationStatus='APPROVED' GROUP BY comment.reviewId")
    List<IdCountProjection> countGroupedByReviewId(
            @Param("reviewIds") Collection<UUID> reviewIds);

    interface IdCountProjection {
        UUID getId();

        long getTotal();
    }
}
