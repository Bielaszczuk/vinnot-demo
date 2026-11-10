package com.vinnot.review.application.command.handler;

import com.vinnot.review.application.command.model.DeleteReviewCommand;
import com.vinnot.review.application.port.in.DeleteReviewUseCase;
import com.vinnot.review.application.port.out.ReviewModerationNotifier;
import com.vinnot.review.domain.model.ReviewPublication;
import com.vinnot.review.application.port.out.ReviewPointsPort;
import com.vinnot.review.application.port.out.ReviewRepositoryPort;
import com.vinnot.review.application.port.out.WineCommandPort;
import com.vinnot.review.domain.model.Review;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DeleteReviewCommandHandler implements DeleteReviewUseCase {

    private static final Logger LOG = LoggerFactory.getLogger(DeleteReviewCommandHandler.class);

    private final ReviewRepositoryPort reviewRepository;
    private final WineCommandPort wineCommandPort;
    private final ReviewModerationNotifier notifier;
    private final ReviewPointsPort points;

    @Override
    @Transactional
    public void execute(DeleteReviewCommand command) {
        UUID wineId = reviewRepository.findWineId(command.reviewId())
                .orElseThrow(() -> new EntityNotFoundException("Review", command.reviewId()));
        wineCommandPort.lockRatingStats(wineId);
        Review review = reviewRepository.findByIdForUpdate(command.reviewId())
                .orElseThrow(() -> new EntityNotFoundException("Review", command.reviewId()));

        if (!command.administrator() && !review.getUserId().equals(command.requestingUserId())) {
            throw new BusinessRuleViolationException(
                    "REVIEW_OWNERSHIP",
                    "You can only delete your own reviews");
        }

        if (command.administrator() && !review.getUserId().equals(command.requestingUserId())) {
            notifier.contentRemoved(ReviewPublication.Type.REVIEW, review.getId(), review.getUserId(), command.reportReason());
        }
        reviewRepository.delete(review);
        points.reviewDeleted(review.getUserId(), wineId, review.getId());

        updateWineRatingStats(wineId);
    }

    private void updateWineRatingStats(UUID wineId) {
        long count = reviewRepository.countByWineId(wineId);
        double avg = reviewRepository.getAverageRatingByWineId(wineId);
        wineCommandPort.updateRatingStats(wineId,
                BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP), (int) count);
        LOG.debug("Updated wine {} rating: avg={}, count={}", wineId, avg, count);
    }
}
