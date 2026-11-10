package com.vinnot.review.application.command.handler;

import com.vinnot.review.application.command.model.DecideReviewPublicationCommand;
import com.vinnot.review.application.port.in.DecideReviewPublicationUseCase;
import com.vinnot.review.application.port.out.ReviewLikeRepositoryPort;
import com.vinnot.review.application.port.out.ReviewModerationNotifier;
import com.vinnot.review.application.port.out.ReviewPointsPort;
import com.vinnot.review.application.port.out.ReviewPublicationRepositoryPort;
import com.vinnot.review.application.port.out.ReviewRepositoryPort;
import com.vinnot.review.application.port.out.WineCommandPort;
import com.vinnot.review.domain.model.PublicationStatus;
import com.vinnot.review.domain.model.ReviewPublication;
import com.vinnot.shared.domain.exception.EntityNotFoundException;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DecideReviewPublicationCommandHandler implements DecideReviewPublicationUseCase {
    private final ReviewPublicationRepositoryPort publications;
    private final ReviewRepositoryPort reviews;
    private final WineCommandPort wines;
    private final ReviewModerationNotifier notifier;
    private final CommentActivityAnnouncer activity;
    private final ReviewPointsPort points;
    private final ReviewLikeRepositoryPort likes;

    @Override
    @Transactional
    public void execute(DecideReviewPublicationCommand command) {
        UUID wine =
                publications
                        .findWineId(command.type(), command.id())
                        .orElseThrow(
                                () -> new EntityNotFoundException("Publication", command.id()));
        wines.lockRatingStats(wine);
        ReviewPublication content =
                publications
                        .findForUpdate(command.type(), command.id())
                        .orElseThrow(
                                () -> new EntityNotFoundException("Publication", command.id()));
        ReviewPublication.Decision decision =
                content.validateDecision(
                        command.reviewerId(),
                        command.status(),
                        command.reasonCode(),
                        command.reason(),
                        command.expectedRevision());
        Instant now = Instant.now();
        publications.decide(content, command.reviewerId(), command.status(), decision, now);
        notifier.publicationDecided(content, command.status(), decision, now);
        if (command.status() == PublicationStatus.APPROVED && content.type() == ReviewPublication.Type.COMMENT) {
            activity.commentPublished(content);
        }
        reward(content, command.status());
        if (content.type() == ReviewPublication.Type.REVIEW) {
            wines.updateRatingStats(
                    wine,
                    BigDecimal.valueOf(reviews.getAverageRatingByWineId(wine))
                            .setScale(2, RoundingMode.HALF_UP),
                    (int) reviews.countByWineId(wine));
        }
    }

    /**
     * Approved content earns its points (a review also one per like it holds), rejected content loses them, a
     * review's likes included; approving again awards them again.
     */
    private void reward(ReviewPublication content, PublicationStatus status) {
        boolean approved = status == PublicationStatus.APPROVED;
        if (content.type() == ReviewPublication.Type.REVIEW) {
            if (approved) {
                points.reviewApproved(content.authorId(), content.wineId(), content.id(), content.content(),
                        likes.findUserIdsByReviewId(content.id()));
            } else {
                points.reviewUnpublished(content.authorId(), content.wineId(), content.id());
            }
        } else if (approved) {
            reviews.findById(content.reviewId()).ifPresent(review ->
                    points.commentPublished(content.authorId(), review.getUserId(), review.getWineId(), content.id()));
        } else {
            points.commentRemoved(content.authorId(), content.id());
        }
    }
}
