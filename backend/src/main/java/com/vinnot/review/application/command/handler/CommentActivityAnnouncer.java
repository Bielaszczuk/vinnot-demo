package com.vinnot.review.application.command.handler;

import com.vinnot.review.application.port.out.CommunityActivityNotifier;
import com.vinnot.review.application.port.out.ReviewRepositoryPort;
import com.vinnot.review.application.port.out.UserQueryPort;
import com.vinnot.review.application.port.out.WineQueryPort;
import com.vinnot.review.domain.model.Review;
import com.vinnot.review.domain.model.ReviewPublication;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

/**
 * Tells a review's author that a comment on it was published (#308): when it is posted, or when a moderator approves a
 * comment left pending before comments were published at once. Nobody is told about their own comment, and nothing is
 * sent while either member blocks the other.
 */
@Component
@RequiredArgsConstructor
class CommentActivityAnnouncer {
    private final ReviewRepositoryPort reviews;
    private final UserQueryPort users;
    private final WineQueryPort wines;
    private final CommunityActivityNotifier notifier;

    /** A comment that was published as it was posted. */
    void commentPublished(UUID commentId, UUID reviewId, UUID commenterId) {
        announce(commentId, reviewId, commenterId);
    }

    /** A pending comment a moderator approved. */
    void commentPublished(ReviewPublication comment) {
        announce(comment.id(), comment.reviewId(), comment.authorId());
    }

    private void announce(UUID commentId, UUID reviewId, UUID commenterId) {
        Optional<Review> review = reviews.findById(reviewId);
        if (review.isEmpty() || review.get().getUserId().equals(commenterId)
                || reviews.isInteractionBlocked(reviewId, commenterId)) {
            return;
        }
        Optional<UserQueryPort.UserData> commenter = users.findById(commenterId);
        Optional<WineQueryPort.WineData> wine = wines.findById(review.get().getWineId());
        if (commenter.isEmpty() || wine.isEmpty()) {
            return;
        }
        notifier.commentPublished(new CommunityActivityNotifier.CommentActivity(commentId, review.get().getUserId(),
                commenter.get().publicName(), wine.get().id(), wine.get().name()));
    }
}
