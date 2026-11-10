package com.vinnot.review.application.command.handler;

import com.vinnot.review.application.command.model.CreateReviewCommand;
import com.vinnot.review.application.command.model.DecideReviewPublicationCommand;
import com.vinnot.review.application.command.model.DeleteReviewCommand;
import com.vinnot.review.application.command.model.DeleteReviewCommentCommand;
import com.vinnot.review.application.command.model.LikeReviewCommand;
import com.vinnot.review.application.command.model.UnlikeReviewCommand;
import com.vinnot.review.application.command.model.UpdateReviewCommand;
import com.vinnot.review.application.port.out.CellarCommandPort;
import com.vinnot.review.application.port.out.ReviewCommentRepositoryPort;
import com.vinnot.review.application.port.out.ReviewLikeRepositoryPort;
import com.vinnot.review.application.port.out.ReviewModerationNotifier;
import com.vinnot.review.application.port.out.ReviewPointsPort;
import com.vinnot.review.application.port.out.ReviewPublicationRepositoryPort;
import com.vinnot.review.application.port.out.ReviewRepositoryPort;
import com.vinnot.review.application.port.out.WineCommandPort;
import com.vinnot.review.application.query.handler.ReviewerInfoResolver;
import com.vinnot.review.domain.model.PublicationRejectionReason;
import com.vinnot.review.domain.model.PublicationStatus;
import com.vinnot.review.domain.model.Review;
import com.vinnot.review.domain.model.ReviewPublication;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** S2 and S3: every review flow gives or takes back its points in the same transaction as the change. */
class ReviewPointsHooksTest {
    private static final String LONG_NOTE = "A long, layered note about black fruit, violets and a finish that lasts minutes.";
    private final ReviewRepositoryPort reviews = mock(ReviewRepositoryPort.class);
    private final WineCommandPort wines = mock(WineCommandPort.class);
    private final CellarCommandPort cellar = mock(CellarCommandPort.class);
    private final ReviewerInfoResolver reviewers = mock(ReviewerInfoResolver.class);
    private final ReviewPointsPort points = mock(ReviewPointsPort.class);
    private final UUID author = UUID.randomUUID();
    private final UUID wine = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        when(reviews.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void aNewReviewEarnsItsPointsWithItsNote() {
        new CreateReviewCommandHandler(reviews, wines, cellar, reviewers, points)
                .execute(new CreateReviewCommand(wine, author, new BigDecimal("2.2"), null, LONG_NOTE, null));

        verify(points).reviewPublished(author, wine, LONG_NOTE);
        verify(cellar).syncReviewToCellar(author, wine, new BigDecimal("2.2"), LONG_NOTE, null);
    }

    @Test
    void editingAnApprovedReviewKeepsItsPointsAndEditingBackToPendingRevokesThem() {
        Review approved = stored(PublicationStatus.APPROVED);
        Review rejected = stored(PublicationStatus.REJECTED);
        var handler = new UpdateReviewCommandHandler(reviews, wines, cellar, reviewers, points);

        handler.execute(new UpdateReviewCommand(approved.getId(), author, false, null, null, LONG_NOTE, null, false));
        handler.execute(new UpdateReviewCommand(rejected.getId(), author, false, null, "Edited", null, null, false));

        verify(points).reviewPublished(author, wine, LONG_NOTE);
        verify(points).reviewUnpublished(author, wine, rejected.getId());
    }

    @Test
    void deletingAReviewRevokesItsPointsAndLikes() {
        Review review = stored(PublicationStatus.APPROVED);

        new DeleteReviewCommandHandler(reviews, wines, mock(ReviewModerationNotifier.class), points)
                .execute(new DeleteReviewCommand(review.getId(), UUID.randomUUID(), true, "SPAM"));

        verify(points).reviewDeleted(author, wine, review.getId());
    }

    @Test
    void likesAndUnlikesMoveTheAuthorsPointIncludingASelfLike() {
        Review review = stored(PublicationStatus.APPROVED);
        ReviewLikeRepositoryPort likes = mock(ReviewLikeRepositoryPort.class);

        new LikeReviewCommandHandler(reviews, likes, points).execute(new LikeReviewCommand(review.getId(), author));
        when(likes.existsByReviewIdAndUserId(review.getId(), author)).thenReturn(true);
        new UnlikeReviewCommandHandler(reviews, likes, points).execute(new UnlikeReviewCommand(review.getId(), author));

        verify(points).likeAdded(author, wine, review.getId(), author);
        verify(points).likeRemoved(author, review.getId(), author);
    }

    @Test
    void aLikeOnAReviewOutOfModerationIsRecordedButEarnsNothing() {
        ReviewLikeRepositoryPort likes = mock(ReviewLikeRepositoryPort.class);
        for (PublicationStatus status : new PublicationStatus[] {PublicationStatus.PENDING, PublicationStatus.REJECTED}) {
            Review review = stored(status);

            new LikeReviewCommandHandler(reviews, likes, points).execute(new LikeReviewCommand(review.getId(), author));

            verify(likes).save(review.getId(), author);
            verify(points, never()).likeAdded(any(), any(), eq(review.getId()), any());
        }
    }

    @Test
    void deletingACommentRevokesTheCommentersPoint() {
        ReviewCommentRepositoryPort comments = mock(ReviewCommentRepositoryPort.class);
        UUID comment = UUID.randomUUID();
        UUID commenter = UUID.randomUUID();
        when(comments.findById(comment)).thenReturn(Optional.of(new ReviewCommentRepositoryPort.ReviewCommentData(
                comment, UUID.randomUUID(), commenter, "Nice", Instant.now(), Instant.now())));

        new DeleteReviewCommentCommandHandler(comments, mock(ReviewModerationNotifier.class), points)
                .execute(new DeleteReviewCommentCommand(comment, UUID.randomUUID(), true, "SPAM"));

        verify(points).commentRemoved(commenter, comment);
    }

    @Test
    void moderationDecisionsAwardApprovedContentAndRevokeRejectedContent() {
        var publications = mock(ReviewPublicationRepositoryPort.class);
        var likes = mock(ReviewLikeRepositoryPort.class);
        var handler = new DecideReviewPublicationCommandHandler(publications, reviews, wines,
                mock(ReviewModerationNotifier.class), mock(CommentActivityAnnouncer.class), points, likes);
        Review parent = stored(PublicationStatus.APPROVED);
        UUID commenter = UUID.randomUUID();
        ReviewPublication review = pending(ReviewPublication.Type.REVIEW, UUID.randomUUID(), parent.getId(), author, LONG_NOTE);
        ReviewPublication comment = pending(ReviewPublication.Type.COMMENT, UUID.randomUUID(), parent.getId(), commenter, "Agreed");
        ReviewPublication orphan = pending(ReviewPublication.Type.COMMENT, UUID.randomUUID(), UUID.randomUUID(), commenter, "Lost");
        UUID liker = UUID.randomUUID();
        when(likes.findUserIdsByReviewId(review.id())).thenReturn(List.of(liker, author));
        for (ReviewPublication content : new ReviewPublication[] {review, comment, orphan}) {
            when(publications.findWineId(content.type(), content.id())).thenReturn(Optional.of(wine));
            when(publications.findForUpdate(content.type(), content.id())).thenReturn(Optional.of(content));
        }

        handler.execute(decide(review, PublicationStatus.APPROVED));
        handler.execute(decide(review, PublicationStatus.REJECTED));
        handler.execute(decide(comment, PublicationStatus.APPROVED));
        handler.execute(decide(comment, PublicationStatus.REJECTED));
        handler.execute(decide(orphan, PublicationStatus.APPROVED));

        verify(points).reviewApproved(author, wine, review.id(), LONG_NOTE, List.of(liker, author));
        verify(points, never()).reviewPublished(any(), any(), any());
        verify(points).reviewUnpublished(author, wine, review.id());
        verify(points).commentPublished(commenter, author, wine, comment.id());
        verify(points).commentRemoved(commenter, comment.id());
        verify(points, never()).commentPublished(any(), any(), any(), eq(orphan.id()));
    }

    @Test
    void aReviewThatDoesNotExistMovesNoPoints() {
        var handler = new DeleteReviewCommandHandler(reviews, wines, mock(ReviewModerationNotifier.class), points);

        assertThatThrownBy(() -> handler.execute(
                new DeleteReviewCommand(UUID.randomUUID(), author, false))).isNotNull();

        verifyNoInteractions(points);
    }

    private DecideReviewPublicationCommand decide(ReviewPublication content, PublicationStatus status) {
        return new DecideReviewPublicationCommand(content.type(), content.id(), UUID.randomUUID(), status,
                status == PublicationStatus.REJECTED ? PublicationRejectionReason.OTHER : null,
                status == PublicationStatus.REJECTED ? "note" : "", content.updatedAt());
    }

    private ReviewPublication pending(ReviewPublication.Type type, UUID id, UUID reviewId, UUID authorId, String text) {
        Instant revision = Instant.parse("2026-10-27T12:00:00Z");
        return new ReviewPublication(type, id, wine, reviewId, authorId, BigDecimal.ONE, "", text,
                PublicationStatus.PENDING, revision, revision, true);
    }

    private Review stored(PublicationStatus status) {
        Review review = Review.builder().id(UUID.randomUUID()).wineId(wine).userId(author).rating(new BigDecimal("4.0"))
                .publicationStatus(status).build();
        when(reviews.findWineId(review.getId())).thenReturn(Optional.of(wine));
        when(reviews.findByIdForUpdate(review.getId())).thenReturn(Optional.of(review));
        when(reviews.findById(review.getId())).thenReturn(Optional.of(review));
        return review;
    }
}
