package com.vinnot.review.infrastructure.gamification;

import com.vinnot.gamification.application.command.model.AwardPointsCommand;
import com.vinnot.gamification.application.command.model.RevokePointsCommand;
import com.vinnot.gamification.application.port.in.AwardPointsUseCase;
import com.vinnot.gamification.domain.model.PointRules;
import com.vinnot.gamification.domain.model.PointSource;
import com.vinnot.gamification.domain.model.PointSubject;
import com.vinnot.review.application.port.out.ReviewPointsPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Review activity as points: a review and its long note are keyed by wine (once per wine), a like by review and liker,
 * a comment by itself. Deleting, rejecting or queueing a review revokes its likes too (so deleting and posting it again
 * nets zero), and approving it awards them again under the same keys.
 */
@Component
@RequiredArgsConstructor
public class GamificationReviewPointsAdapter implements ReviewPointsPort {
    private final AwardPointsUseCase points;

    @Override
    public void reviewPublished(UUID authorId, UUID wineId, String note) {
        points.award(new AwardPointsCommand(authorId, PointSource.REVIEW, wineId.toString(), PointSubject.wine(wineId)));
        if (PointRules.isLongNote(note)) {
            points.award(new AwardPointsCommand(authorId, PointSource.REVIEW_NOTE, wineId.toString(),
                    PointSubject.wine(wineId)));
        }
    }

    @Override
    public void reviewApproved(UUID authorId, UUID wineId, UUID reviewId, String note, List<UUID> likerIds) {
        reviewPublished(authorId, wineId, note);
        likerIds.forEach(likerId -> likeAdded(authorId, wineId, reviewId, likerId));
    }

    @Override
    public void reviewUnpublished(UUID authorId, UUID wineId, UUID reviewId) {
        points.revoke(RevokePointsCommand.of(authorId, PointSource.REVIEW, wineId.toString()));
        points.revoke(RevokePointsCommand.of(authorId, PointSource.REVIEW_NOTE, wineId.toString()));
        points.revoke(RevokePointsCommand.everyKeyStartingWith(authorId, PointSource.LIKE_RECEIVED,
                PointRules.reviewKeyPrefix(reviewId)));
    }

    @Override
    public void reviewDeleted(UUID authorId, UUID wineId, UUID reviewId) {
        reviewUnpublished(authorId, wineId, reviewId);
    }

    @Override
    public void likeAdded(UUID authorId, UUID wineId, UUID reviewId, UUID likerId) {
        points.award(new AwardPointsCommand(authorId, PointSource.LIKE_RECEIVED, PointRules.likeKey(reviewId, likerId),
                PointSubject.wine(wineId)));
    }

    @Override
    public void likeRemoved(UUID authorId, UUID reviewId, UUID likerId) {
        points.revoke(RevokePointsCommand.of(authorId, PointSource.LIKE_RECEIVED, PointRules.likeKey(reviewId, likerId)));
    }

    @Override
    public void commentPublished(UUID commenterId, UUID reviewAuthorId, UUID wineId, UUID commentId) {
        if (commenterId.equals(reviewAuthorId)) {
            return;
        }
        points.award(new AwardPointsCommand(commenterId, PointSource.COMMENT, commentId.toString(),
                PointSubject.wine(wineId)));
    }

    @Override
    public void commentRemoved(UUID commenterId, UUID commentId) {
        points.revoke(RevokePointsCommand.of(commenterId, PointSource.COMMENT, commentId.toString()));
    }
}
