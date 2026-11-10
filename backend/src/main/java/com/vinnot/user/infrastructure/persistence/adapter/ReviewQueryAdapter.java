package com.vinnot.user.infrastructure.persistence.adapter;

import com.vinnot.review.application.port.out.ReviewRepositoryPort;
import com.vinnot.review.domain.model.Review;
import com.vinnot.user.application.port.out.ReviewQueryPort;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

@Component("userReviewQueryAdapter")
@RequiredArgsConstructor
public class ReviewQueryAdapter implements ReviewQueryPort {

    private final ReviewRepositoryPort reviewRepositoryPort;

    @Override
    public UserReviewStats getUserReviewStats(UUID userId) {
        List<Review> reviews = reviewRepositoryPort.findByUserId(userId);
        int count = reviews.size();
        double averageRating = reviews.stream()
                .mapToDouble(r -> r.getRating().doubleValue())
                .average()
                .orElse(0.0);
        return new UserReviewStats(count, averageRating);
    }
}

