package com.vinnot.review.application.command.handler;

import com.vinnot.review.application.command.model.LikeReviewCommand;
import com.vinnot.review.application.port.in.LikeReviewUseCase;
import com.vinnot.review.application.port.out.ReviewLikeRepositoryPort;
import com.vinnot.review.application.port.out.ReviewPointsPort;
import com.vinnot.review.application.port.out.ReviewRepositoryPort;
import com.vinnot.review.domain.model.PublicationStatus;
import com.vinnot.review.domain.model.Review;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LikeReviewCommandHandler implements LikeReviewUseCase {

    private final ReviewRepositoryPort reviewRepository;
    private final ReviewLikeRepositoryPort reviewLikeRepository;
    private final ReviewPointsPort points;

    @Override
    @Transactional
    public void execute(LikeReviewCommand command) {
        final Review review = reviewRepository.findByIdForUpdate(command.reviewId())
                .orElseThrow(() -> new EntityNotFoundException("Review", command.reviewId()));

        if (reviewRepository.isInteractionBlocked(command.reviewId(), command.userId())) {
            throw new EntityNotFoundException("Review", command.reviewId());
        }

        if (reviewLikeRepository.existsByReviewIdAndUserId(command.reviewId(), command.userId())) {
            throw new BusinessRuleViolationException("User has already liked this review");
        }

        reviewLikeRepository.save(command.reviewId(), command.userId());

        review.incrementLikesCount();
        reviewRepository.save(review);
        // A review out of moderation holds no points; approving it awards the likes it has by then.
        if (review.getPublicationStatus() == PublicationStatus.APPROVED) {
            points.likeAdded(review.getUserId(), review.getWineId(), review.getId(), command.userId());
        }
    }
}
