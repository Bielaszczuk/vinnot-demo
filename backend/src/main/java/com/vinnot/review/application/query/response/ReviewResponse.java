package com.vinnot.review.application.query.response;

import com.vinnot.review.domain.model.PublicationStatus;

import com.vinnot.review.domain.model.Review;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ReviewResponse(
        UUID id,
        UUID wineId,
        BigDecimal rating,
        String title,
        String comment,
        Integer vintage,
        int likesCount,
        int commentsCount,
        boolean likedByCurrentUser,
        boolean isVerified,
        Instant createdAt,
        Instant updatedAt,
        ReviewerInfo reviewer,
        WineInfo wine,
        PublicationStatus publicationStatus
) {

    public record ReviewerInfo(
            UUID id,
            String username,
            String displayName,
            String avatarUrl,
            int totalReviews,
            String badgeTier
    ) {
        /** Reviewer info without a seal (a locked or inactive member, or no points read). */
        public ReviewerInfo(UUID id, String username, String displayName, String avatarUrl, int totalReviews) {
            this(id, username, displayName, avatarUrl, totalReviews, null);
        }
    }

    public record WineInfo(
            UUID id,
            String name,
            Integer vintage
    ) {
    }

    /**
     * Creates a ReviewResponse from a domain model.
     *
     * @param review the domain model
     * @return the response
     */
    public static ReviewResponse fromDomain(Review review) {
        return fromDomain(review, null, null);
    }

    /**
     * Creates a ReviewResponse from a domain model with reviewer info.
     *
     * @param review       the domain model
     * @param reviewerInfo the reviewer information (nullable)
     * @param wineInfo     the wine information (nullable)
     * @return the response
     */
    public static ReviewResponse fromDomain(Review review, ReviewerInfo reviewerInfo,
                                              WineInfo wineInfo) {
        return fromDomain(review, reviewerInfo, wineInfo, 0);
    }

    /**
     * Creates a ReviewResponse from a domain model with reviewer info and comments count.
     *
     * @param review        the domain model
     * @param reviewerInfo  the reviewer information (nullable)
     * @param wineInfo      the wine information (nullable)
     * @param commentsCount the number of comments on this review
     * @return the response
     */
    public static ReviewResponse fromDomain(Review review, ReviewerInfo reviewerInfo,
                                              WineInfo wineInfo, int commentsCount) {
        return fromDomain(review, reviewerInfo, wineInfo, commentsCount, false);
    }

    /**
     * Creates a ReviewResponse from a domain model with all contextual data.
     *
     * @param review             the domain model
     * @param reviewerInfo       the reviewer information (nullable)
     * @param wineInfo           the wine information (nullable)
     * @param commentsCount      the number of comments on this review
     * @param likedByCurrentUser whether the current user has liked this review
     * @return the response
     */
    public static ReviewResponse fromDomain(Review review, ReviewerInfo reviewerInfo,
                                              WineInfo wineInfo, int commentsCount,
                                              boolean likedByCurrentUser) {
        return new ReviewResponse(
                review.getId(),
                review.getWineId(),
                review.getRating(),
                review.getTitle(),
                review.getComment(),
                review.getVintage(),
                review.getLikesCount(),
                commentsCount,
                likedByCurrentUser,
                review.isVerified(),
                review.getCreatedAt(),
                review.getUpdatedAt(),
                reviewerInfo,
                wineInfo,
                review.getPublicationStatus()
        );
    }
}

