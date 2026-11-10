package com.vinnot.review.application.command.handler;

import com.vinnot.review.application.port.out.ReviewPointsPort;
import com.vinnot.review.application.command.model.DeleteReviewCommand;
import com.vinnot.review.application.command.model.DeleteReviewCommentCommand;
import com.vinnot.review.application.command.model.UpdateReviewCommand;
import com.vinnot.review.application.port.out.CellarCommandPort;
import com.vinnot.review.application.port.out.ReviewCommentRepositoryPort;
import com.vinnot.review.application.port.out.ReviewRepositoryPort;
import com.vinnot.review.application.port.out.WineCommandPort;
import com.vinnot.review.application.query.handler.ReviewerInfoResolver;
import com.vinnot.review.domain.model.Review;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import com.vinnot.review.application.port.out.ReviewModerationNotifier;
import com.vinnot.review.domain.model.ReviewPublication;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class ReviewOwnershipTest {
    private final ReviewPointsPort points = mock(ReviewPointsPort.class);
    private final ReviewModerationNotifier notifier =
            mock(ReviewModerationNotifier.class);

    @Mock
    private ReviewRepositoryPort repository;
    @Mock
    private WineCommandPort wineCommandPort;
    @Mock
    private CellarCommandPort cellarCommandPort;
    @Mock
    private ReviewerInfoResolver reviewerInfoResolver;
    @Mock
    private ReviewCommentRepositoryPort commentRepository;

    private Review review;

    @BeforeEach
    void setUp() {
        review = Review.create(
                UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("4.5"));
    }

    @Test
    void rejectsDeletingAnotherUsersReview() {
        when(repository.findByIdForUpdate(review.getId())).thenReturn(Optional.of(review));
        lenient().when(repository.findWineId(review.getId())).thenReturn(Optional.of(review.getWineId()));
        DeleteReviewCommandHandler handler =
                new DeleteReviewCommandHandler(repository, wineCommandPort, notifier, points);

        assertThatThrownBy(() -> handler.execute(
                new DeleteReviewCommand(review.getId(), UUID.randomUUID(), false)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("REVIEW_OWNERSHIP");

        verify(repository, never()).delete(review);
        verify(wineCommandPort, never()).updateRatingStats(
                any(),
                any(),
                anyInt());
    }

    @Test
    void allowsAdministratorToDeleteReview() {
        when(repository.findByIdForUpdate(review.getId())).thenReturn(Optional.of(review));
        lenient().when(repository.findWineId(review.getId())).thenReturn(Optional.of(review.getWineId()));
        when(repository.countByWineId(review.getWineId())).thenReturn(0L);
        when(repository.getAverageRatingByWineId(review.getWineId())).thenReturn(0.0);
        DeleteReviewCommandHandler handler =
                new DeleteReviewCommandHandler(repository, wineCommandPort, notifier, points);

        handler.execute(new DeleteReviewCommand(review.getId(), null, true));

        verify(repository).delete(review);
        verify(notifier).contentRemoved(ReviewPublication.Type.REVIEW, review.getId(),
                review.getUserId(), null);
    }

    @Test
    void deletionPropagatesRatingFailureSoTheTransactionRollsBack() {
        when(repository.findByIdForUpdate(review.getId())).thenReturn(Optional.of(review));
        lenient().when(repository.findWineId(review.getId())).thenReturn(Optional.of(review.getWineId()));
        when(repository.countByWineId(review.getWineId()))
                .thenThrow(new IllegalStateException("stats offline"));

        assertThatThrownBy(() -> new DeleteReviewCommandHandler(repository, wineCommandPort, notifier, points)
                .execute(new DeleteReviewCommand(review.getId(), review.getUserId(), false)))
                .isInstanceOf(IllegalStateException.class);

        verify(repository).delete(review);
    }

    @Test
    void rejectsUpdatingAnotherUsersReviewWithoutSideEffects() {
        when(repository.findByIdForUpdate(review.getId())).thenReturn(Optional.of(review));
        lenient().when(repository.findWineId(review.getId())).thenReturn(Optional.of(review.getWineId()));
        UpdateReviewCommandHandler handler = new UpdateReviewCommandHandler(
                repository, wineCommandPort, cellarCommandPort, reviewerInfoResolver, points);

        assertThatThrownBy(() -> handler.execute(new UpdateReviewCommand(
                review.getId(),
                UUID.randomUUID(),
                false,
                new BigDecimal("3.5"),
                "Updated title",
                "Updated comment", null, false)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("REVIEW_OWNERSHIP");

        verify(repository, never()).save(any());
        verify(wineCommandPort, never()).updateRatingStats(any(), any(), anyInt());
        verify(cellarCommandPort, never()).syncReviewToCellar(
                any(), any(), any(), any(), any());
    }

    @Test
    void rejectsDeletingAnotherUsersComment() {
        UUID commentId = UUID.randomUUID();
        UUID commentOwnerId = UUID.randomUUID();
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(
                new ReviewCommentRepositoryPort.ReviewCommentData(
                        commentId,
                        review.getId(),
                        commentOwnerId,
                        "Comment",
                        Instant.now(),
                        Instant.now())));
        DeleteReviewCommentCommandHandler handler =
                new DeleteReviewCommentCommandHandler(commentRepository, notifier, points);

        assertThatThrownBy(() -> handler.execute(
                new DeleteReviewCommentCommand(commentId, UUID.randomUUID(), false)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("REVIEW_COMMENT_OWNERSHIP");

        verify(commentRepository, never()).delete(commentId);
    }

    @Test
    void allowsAdministratorToDeleteAnotherUsersComment() {
        UUID commentId = UUID.randomUUID();
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(
                new ReviewCommentRepositoryPort.ReviewCommentData(
                        commentId,
                        review.getId(),
                        UUID.randomUUID(),
                        "Comment",
                        Instant.now(),
                        Instant.now())));
        DeleteReviewCommentCommandHandler handler =
                new DeleteReviewCommentCommandHandler(commentRepository, notifier, points);

        handler.execute(new DeleteReviewCommentCommand(commentId, null, true, "HARASSMENT"));

        verify(commentRepository).delete(commentId);
        verify(notifier).contentRemoved(eq(ReviewPublication.Type.COMMENT),
                eq(commentId), any(),
                eq("HARASSMENT"));
    }

    @Test
    void authorsDeletingTheirOwnContentAreNotNotified() {
        UUID commentId = UUID.randomUUID();
        UUID owner = UUID.randomUUID();
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(
                new ReviewCommentRepositoryPort.ReviewCommentData(commentId, review.getId(), owner, "Comment",
                        Instant.now(), Instant.now())));

        new DeleteReviewCommentCommandHandler(commentRepository, notifier, points)
                .execute(new DeleteReviewCommentCommand(commentId, owner, true));

        verify(commentRepository).delete(commentId);
        verifyNoInteractions(notifier);
    }
}
