package com.vinnot.review.infrastructure.gamification;

import com.vinnot.gamification.application.command.model.AwardPointsCommand;
import com.vinnot.gamification.application.command.model.RevokePointsCommand;
import com.vinnot.gamification.application.port.in.AwardPointsUseCase;
import com.vinnot.gamification.application.port.in.GetPointStandingsUseCase;
import com.vinnot.gamification.domain.model.PointSource;
import com.vinnot.gamification.domain.model.PointSubject;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/** S2 and S3: how review activity maps to point sources and keys. */
class GamificationReviewPointsAdapterTest {
    private final AwardPointsUseCase points = mock(AwardPointsUseCase.class);
    private final GamificationReviewPointsAdapter adapter = new GamificationReviewPointsAdapter(points);
    private final UUID author = UUID.randomUUID();
    private final UUID wine = UUID.randomUUID();

    @Test
    void aReviewEarnsPerWineAndItsNoteOnlyFromEightyCharacters() {
        adapter.reviewPublished(author, wine, "Short note");
        adapter.reviewPublished(author, wine, "x".repeat(80));

        verify(points, times(2)).award(new AwardPointsCommand(author, PointSource.REVIEW,
                wine.toString(), PointSubject.wine(wine)));
        verify(points).award(new AwardPointsCommand(author, PointSource.REVIEW_NOTE, wine.toString(), PointSubject.wine(wine)));
    }

    @Test
    void unpublishingRevokesTheReviewAndNoteAndDeletingAlsoItsLikes() {
        UUID review = UUID.randomUUID();

        adapter.reviewDeleted(author, wine, review);

        verify(points).revoke(RevokePointsCommand.of(author, PointSource.REVIEW, wine.toString()));
        verify(points).revoke(RevokePointsCommand.of(author, PointSource.REVIEW_NOTE, wine.toString()));
        verify(points).revoke(RevokePointsCommand.everyKeyStartingWith(author, PointSource.LIKE_RECEIVED, review + ":"));
    }

    @Test
    void unpublishingAlsoRevokesTheLikesTheReviewReceived() {
        UUID review = UUID.randomUUID();

        adapter.reviewUnpublished(author, wine, review);

        verify(points).revoke(RevokePointsCommand.of(author, PointSource.REVIEW, wine.toString()));
        verify(points).revoke(RevokePointsCommand.of(author, PointSource.REVIEW_NOTE, wine.toString()));
        verify(points).revoke(RevokePointsCommand.everyKeyStartingWith(author, PointSource.LIKE_RECEIVED, review + ":"));
    }

    @Test
    void approvalAwardsTheReviewItsNoteAndOnePointPerCurrentLikeWithTheSameKeys() {
        UUID review = UUID.randomUUID();
        UUID liker = UUID.randomUUID();

        adapter.reviewApproved(author, wine, review, "x".repeat(80), List.of(liker, author));

        verify(points).award(new AwardPointsCommand(author, PointSource.REVIEW, wine.toString(), PointSubject.wine(wine)));
        verify(points).award(new AwardPointsCommand(author, PointSource.REVIEW_NOTE, wine.toString(), PointSubject.wine(wine)));
        verify(points).award(new AwardPointsCommand(author, PointSource.LIKE_RECEIVED, review + ":" + liker,
                PointSubject.wine(wine)));
        verify(points).award(new AwardPointsCommand(author, PointSource.LIKE_RECEIVED, review + ":" + author,
                PointSubject.wine(wine)));
    }

    @Test
    void likesAreKeyedByReviewAndLiker() {
        UUID review = UUID.randomUUID();
        UUID liker = UUID.randomUUID();

        adapter.likeAdded(author, wine, review, liker);
        adapter.likeRemoved(author, review, liker);

        verify(points).award(new AwardPointsCommand(author, PointSource.LIKE_RECEIVED, review + ":" + liker,
                PointSubject.wine(wine)));
        verify(points).revoke(RevokePointsCommand.of(author, PointSource.LIKE_RECEIVED, review + ":" + liker));
    }

    @Test
    void onlyACommentOnSomeoneElsesReviewEarns() {
        UUID commenter = UUID.randomUUID();
        UUID comment = UUID.randomUUID();

        adapter.commentPublished(author, author, wine, UUID.randomUUID());
        verify(points, never()).award(any());

        adapter.commentPublished(commenter, author, wine, comment);
        adapter.commentRemoved(commenter, comment);

        verify(points).award(new AwardPointsCommand(commenter, PointSource.COMMENT, comment.toString(), PointSubject.wine(wine)));
        verify(points).revoke(RevokePointsCommand.of(commenter, PointSource.COMMENT, comment.toString()));
    }

    @Test
    void badgesComeFromThePointsModule() {
        var standings = mock(GetPointStandingsUseCase.class);
        new GamificationReviewerBadgeAdapter(standings).badgeTiers(List.of(author));
        verify(standings).badgeTiers(List.of(author));
        verifyNoInteractions(points);
    }
}
