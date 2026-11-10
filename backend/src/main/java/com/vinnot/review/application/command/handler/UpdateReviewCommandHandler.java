package com.vinnot.review.application.command.handler;

import com.vinnot.review.application.command.model.UpdateReviewCommand;
import com.vinnot.review.application.port.in.UpdateReviewUseCase;
import com.vinnot.review.application.port.out.CellarCommandPort;
import com.vinnot.review.application.port.out.ReviewPointsPort;
import com.vinnot.review.application.port.out.ReviewRepositoryPort;
import com.vinnot.review.application.port.out.WineCommandPort;
import com.vinnot.review.application.query.handler.ReviewerInfoResolver;
import com.vinnot.review.application.query.response.ReviewResponse;
import com.vinnot.review.domain.model.PublicationStatus;
import com.vinnot.review.domain.model.Review;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
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
public class UpdateReviewCommandHandler implements UpdateReviewUseCase {

    private static final Logger LOG = LoggerFactory.getLogger(UpdateReviewCommandHandler.class);

    private final ReviewRepositoryPort reviewRepository;
    private final WineCommandPort wineCommandPort;
    private final CellarCommandPort cellarCommandPort;
    private final ReviewerInfoResolver reviewerInfoResolver;
    private final ReviewPointsPort points;

    @Override
    @Transactional
    public ReviewResponse execute(UpdateReviewCommand command) {
        UUID wineId = reviewRepository.findWineId(command.reviewId())
                .orElseThrow(() -> new EntityNotFoundException("Review", command.reviewId()));
        wineCommandPort.lockRatingStats(wineId);
        Review review = reviewRepository.findByIdForUpdate(command.reviewId())
                .orElseThrow(() -> new EntityNotFoundException("Review", command.reviewId()));

        if (!command.administrator() && !review.getUserId().equals(command.requestingUserId())) {
            throw new BusinessRuleViolationException(
                    "REVIEW_OWNERSHIP",
                    "You can only update your own reviews");
        }

        review.updateContent(command.rating(), command.title(), command.comment());
        // Older app versions never send the vintage: omitting it keeps the stored one, only clearVintage removes it.
        if (command.clearVintage()) {
            review.updateVintage(null);
        } else if (Objects.nonNull(command.vintage())) {
            review.updateVintage(command.vintage());
        }
        Review saved = reviewRepository.save(review);

        updateWineRatingStats(review.getWineId());
        syncAuthorCellar(command, saved);
        // An approved review keeps (or, with a long note now, gains) its points; one back in moderation loses them.
        if (saved.getPublicationStatus() == PublicationStatus.APPROVED) {
            points.reviewPublished(saved.getUserId(), saved.getWineId(), saved.getComment());
        } else {
            points.reviewUnpublished(saved.getUserId(), saved.getWineId(), saved.getId());
        }

        ReviewResponse.ReviewerInfo reviewerInfo = reviewerInfoResolver.resolveForReview(saved.getUserId());
        return ReviewResponse.fromDomain(saved, reviewerInfo, null);
    }

    /**
     * The cellar is the author's private record: only the author's own edit syncs it,
     * and only with the fields that edit supplied (omitted notes are never overwritten). A supplied vintage is
     * copied too; an omitted or cleared review vintage leaves the cellar vintage as it is.
     */
    private void syncAuthorCellar(UpdateReviewCommand command, Review review) {
        if (!review.getUserId().equals(command.requestingUserId())) {
            return;
        }
        BigDecimal cellarRating = review.getRating();
        Integer vintage = command.clearVintage() ? null : command.vintage();
        if (Objects.nonNull(command.comment())) {
            cellarCommandPort.syncReviewToCellar(
                    review.getUserId(), review.getWineId(), cellarRating, command.comment(), vintage);
        } else if (Objects.nonNull(command.rating()) || Objects.nonNull(vintage)) {
            cellarCommandPort.syncReviewRatingToCellar(
                    review.getUserId(), review.getWineId(), cellarRating, vintage);
        }
    }

    private void updateWineRatingStats(UUID wineId) {
        long count = reviewRepository.countByWineId(wineId);
        double avg = reviewRepository.getAverageRatingByWineId(wineId);
        wineCommandPort.updateRatingStats(wineId,
                BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP), (int) count);
        LOG.debug("Updated wine {} rating: avg={}, count={}", wineId, avg, count);
    }
}
