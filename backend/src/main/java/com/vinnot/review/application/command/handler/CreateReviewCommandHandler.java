package com.vinnot.review.application.command.handler;

import com.vinnot.review.application.command.model.CreateReviewCommand;
import com.vinnot.review.application.port.in.CreateReviewUseCase;
import com.vinnot.review.application.port.out.CellarCommandPort;
import com.vinnot.review.application.port.out.ReviewPointsPort;
import com.vinnot.review.application.port.out.ReviewRepositoryPort;
import com.vinnot.review.application.port.out.WineCommandPort;
import com.vinnot.review.application.query.handler.ReviewerInfoResolver;
import com.vinnot.review.application.query.response.ReviewResponse;
import com.vinnot.review.domain.model.Review;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CreateReviewCommandHandler implements CreateReviewUseCase {

    private static final Logger LOG = LoggerFactory.getLogger(CreateReviewCommandHandler.class);

    private final ReviewRepositoryPort reviewRepository;
    private final WineCommandPort wineCommandPort;
    private final CellarCommandPort cellarCommandPort;
    private final ReviewerInfoResolver reviewerInfoResolver;
    private final ReviewPointsPort points;

    @Override
    @Transactional
    public ReviewResponse execute(CreateReviewCommand command) {
        wineCommandPort.lockRatingStats(command.wineId());
        if (reviewRepository.existsByWineIdAndUserId(command.wineId(), command.userId())) {
            throw new BusinessRuleViolationException("User has already reviewed this wine");
        }

        Review review = Review.create(command.wineId(), command.userId(), command.rating());
        review.updateContent(command.rating(), command.title(), command.comment());
        review.updateVintage(command.vintage());

        Review saved = reviewRepository.save(review);

        updateWineRatingStats(command.wineId());
        // A new review is published at once, so it earns its points in this transaction.
        points.reviewPublished(saved.getUserId(), saved.getWineId(), saved.getComment());

        // The cellar keeps the same one-decimal rating as the review (#455).
        BigDecimal cellarRating = saved.getRating();
        // The cellar notes are the author's private record: a review without a comment never erases them.
        if (Objects.nonNull(command.comment()) && !command.comment().isBlank()) {
            cellarCommandPort.syncReviewToCellar(
                    command.userId(), command.wineId(), cellarRating, command.comment(), command.vintage());
        } else {
            cellarCommandPort.syncReviewRatingToCellar(
                    command.userId(), command.wineId(), cellarRating, command.vintage());
        }

        ReviewResponse.ReviewerInfo reviewerInfo = reviewerInfoResolver.resolveForReview(command.userId());
        return ReviewResponse.fromDomain(saved, reviewerInfo, null);
    }

    private void updateWineRatingStats(UUID wineId) {
        long count = reviewRepository.countByWineId(wineId);
        double avg = reviewRepository.getAverageRatingByWineId(wineId);
        wineCommandPort.updateRatingStats(wineId,
                BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP), (int) count);
        LOG.debug("Updated wine {} rating: avg={}, count={}", wineId, avg, count);
    }
}
