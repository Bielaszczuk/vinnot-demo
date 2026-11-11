package com.vinnot.community.application.query.response;

import com.vinnot.community.application.port.out.SocialQueryPort.ReviewRow;
import com.vinnot.community.domain.model.PublicName;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** An approved review in the following feed or on a member's profile. */
public record UserReviewResponse(UUID reviewId, BigDecimal rating, String title, String comment, Integer vintage,
        Instant createdAt, Reviewer reviewer, WineSummary wine) {

    /** @param tier the seal key, or {@code null} when the reviewer shows none */
    public record Reviewer(UUID id, String username, String displayName, String avatarUrl, String tier) { }

    /** @param avatarUrl the reviewer's profile photo URL clients load, or {@code null} without one */
    public static UserReviewResponse from(ReviewRow row, String avatarUrl, String tier) {
        return new UserReviewResponse(row.reviewId(), row.rating(), row.title(), row.comment(), row.vintage(),
                row.createdAt(),
                new Reviewer(row.reviewerId(), row.reviewerUsername(),
                        PublicName.of(row.reviewerUsername(), row.reviewerFirstName(), row.reviewerLastName()),
                        avatarUrl, tier),
                WineSummary.from(row.wine()));
    }
}
