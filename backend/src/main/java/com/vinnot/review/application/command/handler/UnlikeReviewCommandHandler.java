package com.vinnot.review.application.command.handler;

import com.vinnot.review.application.command.model.UnlikeReviewCommand;
import com.vinnot.review.application.port.in.UnlikeReviewUseCase;
import com.vinnot.review.application.port.out.ReviewLikeRepositoryPort;
import com.vinnot.review.application.port.out.ReviewPointsPort;
import com.vinnot.review.application.port.out.ReviewRepositoryPort;
import com.vinnot.review.domain.model.Review;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UnlikeReviewCommandHandler implements UnlikeReviewUseCase {

    private final ReviewRepositoryPort reviewRepository;
    private final ReviewLikeRepositoryPort reviewLikeRepository;
    private final ReviewPointsPort points;

    @Override
    @Transactional
    public void execute(UnlikeReviewCommand command) {
        Review review = reviewRepository.findByIdForUpdate(command.reviewId())
                .orElseThrow(() -> new EntityNotFoundException("Review", command.reviewId()));

        if (!reviewLikeRepository.existsByReviewIdAndUserId(command.reviewId(), command.userId())) {
            throw new BusinessRuleViolationException("User has not liked this review");
        }

        reviewLikeRepository.deleteByReviewIdAndUserId(command.reviewId(), command.userId());

        review.decrementLikesCount();
        reviewRepository.save(review);
        points.likeRemoved(review.getUserId(), review.getId(), command.userId());
    }
}
