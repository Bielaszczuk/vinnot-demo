package com.vinnot.review.application.command.handler;

import com.vinnot.review.application.port.out.ReviewPointsPort;
import com.vinnot.review.application.command.model.AddReviewCommentCommand;
import com.vinnot.review.application.command.model.CreateReviewCommand;
import com.vinnot.review.application.command.model.LikeReviewCommand;
import com.vinnot.review.application.command.model.UnlikeReviewCommand;
import com.vinnot.review.application.command.model.UpdateReviewCommand;
import com.vinnot.review.application.port.out.CellarCommandPort;
import com.vinnot.review.application.port.out.ReviewCommentRepositoryPort;
import com.vinnot.review.application.port.out.ReviewLikeRepositoryPort;
import com.vinnot.review.application.port.out.ReviewRepositoryPort;
import com.vinnot.review.application.port.out.WineCommandPort;
import com.vinnot.review.application.query.handler.ReviewerInfoResolver;
import com.vinnot.review.domain.model.PublicationStatus;
import com.vinnot.review.domain.model.Review;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

class ReviewInteractionHandlersTest {
    private final ReviewPointsPort points = mock(ReviewPointsPort.class);

    private ReviewRepositoryPort reviews;
    private WineCommandPort wines;
    private CellarCommandPort cellar;
    private ReviewerInfoResolver reviewers;

    @BeforeEach
    void setUp() {
        reviews = mock(ReviewRepositoryPort.class);
        wines = mock(WineCommandPort.class);
        cellar = mock(CellarCommandPort.class);
        reviewers = mock(ReviewerInfoResolver.class);
        when(reviews.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void createsReviewSynchronizingRatingAndCellar() {
        UUID wineId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(reviews.countByWineId(wineId)).thenReturn(2L);
        when(reviews.getAverageRatingByWineId(wineId)).thenReturn(4.25);

        var response = new CreateReviewCommandHandler(reviews, wines, cellar, reviewers, points)
                .execute(new CreateReviewCommand(wineId, userId,
                        new BigDecimal("4.6"), "Great", "Balanced", null));

        assertThat(response.rating()).isEqualByComparingTo("4.6");
        verify(wines).updateRatingStats(wineId, new BigDecimal("4.25"), 2);
        verify(cellar).syncReviewToCellar(userId, wineId, new BigDecimal("4.6"), "Balanced", null);
    }

    @Test
    void createsReviewWithoutCommentSyncingOnlyTheRatingSoCellarNotesSurvive() {
        UUID wineId = UUID.randomUUID();
        UUID otherWineId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        var handler = new CreateReviewCommandHandler(reviews, wines, cellar, reviewers, points);

        handler.execute(new CreateReviewCommand(wineId, userId, new BigDecimal("3.6"), "Title only", null, null));
        handler.execute(new CreateReviewCommand(otherWineId, userId, new BigDecimal("2"), null, "   ", null));

        verify(cellar).syncReviewRatingToCellar(userId, wineId, new BigDecimal("3.6"), null);
        verify(cellar).syncReviewRatingToCellar(userId, otherWineId, new BigDecimal("2"), null);
        verify(cellar, never()).syncReviewToCellar(any(), any(), any(), any(), any());
    }

    @Test
    void createsReviewWithTastedVintageAndSyncsItToTheCellar() {
        UUID wineId = UUID.randomUUID();
        UUID otherWineId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        var handler = new CreateReviewCommandHandler(reviews, wines, cellar, reviewers, points);

        var response = handler.execute(new CreateReviewCommand(
                wineId, userId, new BigDecimal("4.0"), null, "Notes", 2018));
        handler.execute(new CreateReviewCommand(
                otherWineId, userId, new BigDecimal("3.0"), null, null, 2015));

        assertThat(response.vintage()).isEqualTo(2018);
        assertThat(response.wine()).isNull();
        verify(cellar).syncReviewToCellar(userId, wineId, new BigDecimal("4.0"), "Notes", 2018);
        verify(cellar).syncReviewRatingToCellar(userId, otherWineId, new BigDecimal("3.0"), 2015);
    }

    @Test
    void rejectsAnImpossibleVintageBeforeSaving() {
        var handler = new CreateReviewCommandHandler(reviews, wines, cellar, reviewers, points);

        assertThatThrownBy(() -> handler.execute(new CreateReviewCommand(
                UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("4.0"), null, null, 1799)))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_VINTAGE");
        verify(reviews, never()).save(any());
        verifyNoInteractions(cellar);
    }

    @Test
    void rejectsDuplicateReviewAndPropagatesStatsFailureForRollback() {
        UUID wineId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(reviews.existsByWineIdAndUserId(wineId, userId)).thenReturn(true);
        var handler = new CreateReviewCommandHandler(reviews, wines, cellar, reviewers, points);
        assertThatThrownBy(() -> handler.execute(new CreateReviewCommand(
                wineId, userId, BigDecimal.ONE, null, null, null)))
                .isInstanceOf(BusinessRuleViolationException.class);

        when(reviews.existsByWineIdAndUserId(wineId, userId)).thenReturn(false);
        when(reviews.countByWineId(wineId)).thenThrow(new IllegalStateException("stats offline"));
        assertThatThrownBy(() -> handler.execute(new CreateReviewCommand(
                wineId, userId, BigDecimal.ONE, null, null, null))).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void updatesOwnedReviewAndAllowsAdministrator() {
        Review review = Review.create(UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("3"));
        when(reviews.findByIdForUpdate(review.getId())).thenReturn(Optional.of(review));
        lenient().when(reviews.findWineId(review.getId())).thenReturn(Optional.of(review.getWineId()));
        when(reviews.countByWineId(review.getWineId())).thenReturn(1L);
        when(reviews.getAverageRatingByWineId(review.getWineId())).thenReturn(4.0);
        var handler = new UpdateReviewCommandHandler(reviews, wines, cellar, reviewers, points);

        handler.execute(new UpdateReviewCommand(review.getId(), review.getUserId(), false,
                new BigDecimal("4"), "Updated", "Better", null, false));
        handler.execute(new UpdateReviewCommand(review.getId(), UUID.randomUUID(), true,
                new BigDecimal("5"), "Admin", "Verified", null, false));

        assertThat(review.getRating()).isEqualByComparingTo("5");
        verify(cellar).syncReviewToCellar(review.getUserId(), review.getWineId(), new BigDecimal("4"), "Better", null);

        when(reviews.countByWineId(review.getWineId()))
                .thenThrow(new IllegalStateException("stats offline"));
        assertThatThrownBy(() -> handler.execute(new UpdateReviewCommand(
                review.getId(), review.getUserId(), false,
                new BigDecimal("4"), "Retry", "Must roll back", null, false))).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void commentsRequireExistingReviewAndValidContentAndArePublishedAtOnce() {
        ReviewCommentRepositoryPort comments = mock(ReviewCommentRepositoryPort.class);
        UUID reviewId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        CommentActivityAnnouncer activity = mock(CommentActivityAnnouncer.class);
        var handler = new AddReviewCommentCommandHandler(reviews, comments, reviewers, activity, points);

        assertThatThrownBy(() -> handler.execute(
                new AddReviewCommentCommand(reviewId, userId, "hello")))
                .isInstanceOf(EntityNotFoundException.class);

        Review review = Review.builder().id(reviewId).wineId(UUID.randomUUID()).userId(UUID.randomUUID())
                .rating(BigDecimal.ONE).build();
        when(reviews.findById(reviewId)).thenReturn(Optional.of(review));
        assertThatThrownBy(() -> handler.execute(
                new AddReviewCommentCommand(reviewId, userId, " ")))
                .isInstanceOf(BusinessRuleViolationException.class);
        assertThatThrownBy(() -> handler.execute(
                new AddReviewCommentCommand(reviewId, userId, "x".repeat(2001))))
                .isInstanceOf(BusinessRuleViolationException.class);

        UUID commentId = UUID.randomUUID();
        when(comments.save(reviewId, userId, "hello", PublicationStatus.APPROVED)).thenReturn(commentId);
        var published = handler.execute(new AddReviewCommentCommand(reviewId, userId, " hello "));
        assertThat(published.content()).isEqualTo("hello");
        assertThat(published.publicationStatus()).isEqualTo(PublicationStatus.APPROVED);
        verify(activity).commentPublished(commentId, reviewId, userId);
        verify(points).commentPublished(userId, review.getUserId(), review.getWineId(), commentId);
    }

    @Test
    void likesAndUnlikesReviewWithDuplicateProtection() {
        ReviewLikeRepositoryPort likes = mock(ReviewLikeRepositoryPort.class);
        Review review = Review.create(UUID.randomUUID(), UUID.randomUUID(), BigDecimal.ONE);
        UUID userId = UUID.randomUUID();
        when(reviews.findByIdForUpdate(review.getId())).thenReturn(Optional.of(review));
        lenient().when(reviews.findWineId(review.getId())).thenReturn(Optional.of(review.getWineId()));

        new LikeReviewCommandHandler(reviews, likes, points).execute(
                new LikeReviewCommand(review.getId(), userId));
        assertThat(review.getLikesCount()).isEqualTo(1);

        when(likes.existsByReviewIdAndUserId(review.getId(), userId)).thenReturn(true);
        assertThatThrownBy(() -> new LikeReviewCommandHandler(reviews, likes, points).execute(
                new LikeReviewCommand(review.getId(), userId)))
                .isInstanceOf(BusinessRuleViolationException.class);

        new UnlikeReviewCommandHandler(reviews, likes, points).execute(
                new UnlikeReviewCommand(review.getId(), userId));
        assertThat(review.getLikesCount()).isZero();
        when(likes.existsByReviewIdAndUserId(review.getId(), userId)).thenReturn(false);
        assertThatThrownBy(() -> new UnlikeReviewCommandHandler(reviews, likes, points).execute(
                new UnlikeReviewCommand(review.getId(), userId)))
                .isInstanceOf(BusinessRuleViolationException.class);
    }
}
