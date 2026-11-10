package com.vinnot.user.application.port.out;

import java.util.UUID;

public interface ReviewQueryPort {

    record UserReviewStats(int count, double averageRating) {
    }

    /**
     * Gets review statistics for a user.
     *
     * @param userId the user ID
     * @return the review statistics
     */
    UserReviewStats getUserReviewStats(UUID userId);
}
