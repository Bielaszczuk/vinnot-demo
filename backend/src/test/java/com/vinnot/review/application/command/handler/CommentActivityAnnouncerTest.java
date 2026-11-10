package com.vinnot.review.application.command.handler;

import com.vinnot.review.application.port.out.CommunityActivityNotifier;
import com.vinnot.review.application.port.out.ReviewRepositoryPort;
import com.vinnot.review.application.port.out.UserQueryPort;
import com.vinnot.review.application.port.out.WineQueryPort;
import com.vinnot.review.domain.model.PublicationStatus;
import com.vinnot.review.domain.model.Review;
import com.vinnot.review.domain.model.ReviewPublication;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CommentActivityAnnouncerTest {
    private static final UUID WINE = UUID.randomUUID();
    private static final UUID REVIEW_AUTHOR = UUID.randomUUID();
    private static final UUID COMMENTER = UUID.randomUUID();

    private final ReviewRepositoryPort reviews = mock(ReviewRepositoryPort.class);
    private final UserQueryPort users = mock(UserQueryPort.class);
    private final WineQueryPort wines = mock(WineQueryPort.class);
    private final CommunityActivityNotifier notifier = mock(CommunityActivityNotifier.class);
    private final CommentActivityAnnouncer announcer = new CommentActivityAnnouncer(reviews, users, wines, notifier);

    @Test
    void theReviewAuthorLearnsWhoCommentedOnWhichWine() {
        Review review = review(REVIEW_AUTHOR);
        ReviewPublication comment = comment(review.getId(), COMMENTER);
        when(reviews.findById(review.getId())).thenReturn(Optional.of(review));
        when(users.findById(COMMENTER)).thenReturn(Optional.of(new UserQueryPort.UserData(COMMENTER, "lu_vino", "Lucía", "Pérez", null)));
        when(wines.findById(WINE)).thenReturn(Optional.of(new WineQueryPort.WineData(WINE, "Gran Malbec", 2021)));

        announcer.commentPublished(comment);

        verify(notifier).commentPublished(new CommunityActivityNotifier.CommentActivity(comment.id(), REVIEW_AUTHOR,
                "Lucía Pérez", WINE, "Gran Malbec"));
    }

    @Test
    void aCommentPostedNowIsAnnouncedWithTheReviewsWine() {
        Review review = review(REVIEW_AUTHOR);
        UUID commentId = UUID.randomUUID();
        when(reviews.findById(review.getId())).thenReturn(Optional.of(review));
        when(users.findById(COMMENTER)).thenReturn(Optional.of(new UserQueryPort.UserData(COMMENTER, "lu_vino", "Lucía", null, null)));
        when(wines.findById(WINE)).thenReturn(Optional.of(new WineQueryPort.WineData(WINE, "Gran Malbec", 2021)));

        announcer.commentPublished(commentId, review.getId(), COMMENTER);

        verify(notifier).commentPublished(new CommunityActivityNotifier.CommentActivity(commentId, REVIEW_AUTHOR,
                "Lucía", WINE, "Gran Malbec"));
    }

    @Test
    void theCommenterIsNamedByUsernameWithoutAFullName() {
        Review review = review(REVIEW_AUTHOR);
        ReviewPublication comment = comment(review.getId(), COMMENTER);
        when(reviews.findById(review.getId())).thenReturn(Optional.of(review));
        when(users.findById(COMMENTER)).thenReturn(Optional.of(new UserQueryPort.UserData(COMMENTER, "lu_vino", " ", null, null)));
        when(wines.findById(WINE)).thenReturn(Optional.of(new WineQueryPort.WineData(WINE, "Gran Malbec", 2021)));

        announcer.commentPublished(comment);

        verify(notifier).commentPublished(new CommunityActivityNotifier.CommentActivity(comment.id(), REVIEW_AUTHOR,
                "lu_vino", WINE, "Gran Malbec"));
    }

    @Test
    void nobodyIsToldAboutTheirOwnCommentOrWhileABlockStands() {
        Review own = review(COMMENTER);
        when(reviews.findById(own.getId())).thenReturn(Optional.of(own));
        announcer.commentPublished(comment(own.getId(), COMMENTER));

        Review blocked = review(REVIEW_AUTHOR);
        when(reviews.findById(blocked.getId())).thenReturn(Optional.of(blocked));
        when(reviews.isInteractionBlocked(blocked.getId(), COMMENTER)).thenReturn(true);
        announcer.commentPublished(comment(blocked.getId(), COMMENTER));

        UUID gone = UUID.randomUUID();
        when(reviews.findById(gone)).thenReturn(Optional.empty());
        announcer.commentPublished(comment(gone, COMMENTER));

        Review unknownCommenter = review(REVIEW_AUTHOR);
        when(reviews.findById(unknownCommenter.getId())).thenReturn(Optional.of(unknownCommenter));
        when(users.findById(COMMENTER)).thenReturn(Optional.empty());
        announcer.commentPublished(comment(unknownCommenter.getId(), COMMENTER));

        verify(notifier, never()).commentPublished(any());
    }

    private static Review review(UUID author) {
        return Review.create(WINE, author, BigDecimal.valueOf(4));
    }

    private static ReviewPublication comment(UUID reviewId, UUID author) {
        Instant now = Instant.now();
        return new ReviewPublication(ReviewPublication.Type.COMMENT, UUID.randomUUID(), WINE, reviewId, author, null, "",
                "Great pick", PublicationStatus.APPROVED, now, now, true);
    }
}
