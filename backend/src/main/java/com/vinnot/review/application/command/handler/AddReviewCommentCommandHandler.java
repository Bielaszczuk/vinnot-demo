package com.vinnot.review.application.command.handler;

import com.vinnot.review.domain.model.PublicationStatus;

import com.vinnot.review.application.command.model.AddReviewCommentCommand;
import com.vinnot.review.application.port.in.AddReviewCommentUseCase;
import com.vinnot.review.application.port.out.ReviewCommentRepositoryPort;
import com.vinnot.review.application.port.out.ReviewPointsPort;
import com.vinnot.review.application.port.out.ReviewRepositoryPort;
import com.vinnot.review.application.query.handler.ReviewerInfoResolver;
import com.vinnot.review.application.query.response.ReviewCommentResponse;
import com.vinnot.review.domain.model.Review;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AddReviewCommentCommandHandler implements AddReviewCommentUseCase {
    /** Comments are public as soon as they are posted; moderation acts on reports and blocks afterwards. */
    private static final PublicationStatus NEW_COMMENT_STATUS = PublicationStatus.APPROVED;

    private static final int MAX_COMMENT_LENGTH = 2000;

    private final ReviewRepositoryPort reviewRepository;
    private final ReviewCommentRepositoryPort commentRepository;
    private final ReviewerInfoResolver reviewerInfoResolver;
    private final CommentActivityAnnouncer activity;
    private final ReviewPointsPort points;

    @Override
    @Transactional
    public ReviewCommentResponse execute(AddReviewCommentCommand command) {
        final Review review = reviewRepository.findById(command.reviewId())
                .orElseThrow(() -> new EntityNotFoundException("Review", command.reviewId()));

        if (reviewRepository.isInteractionBlocked(command.reviewId(), command.userId())) {
            throw new EntityNotFoundException("Review", command.reviewId());
        }

        String content = Objects.isNull(command.content()) ? "" : command.content().trim();
        if (content.isEmpty() || content.length() > MAX_COMMENT_LENGTH) {
            throw new BusinessRuleViolationException(
                    "Comment content must be between 1 and " + MAX_COMMENT_LENGTH + " characters");
        }

        UUID commentId = commentRepository.save(command.reviewId(), command.userId(), content, NEW_COMMENT_STATUS);
        activity.commentPublished(commentId, command.reviewId(), command.userId());
        points.commentPublished(command.userId(), review.getUserId(), review.getWineId(), commentId);

        ReviewCommentResponse.ReviewerInfo reviewerInfo =
                reviewerInfoResolver.resolveForComment(command.userId());
        Instant now = Instant.now();
        return new ReviewCommentResponse(
                commentId, command.reviewId(), now, now, content, reviewerInfo, NEW_COMMENT_STATUS
        );
    }
}

