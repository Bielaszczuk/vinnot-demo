package com.vinnot.review.application.command.handler;

import com.vinnot.review.application.port.out.ReviewLikeRepositoryPort;
import com.vinnot.review.application.port.out.ReviewPointsPort;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.anyInt;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.eq;

import com.vinnot.review.application.command.model.DecideReviewPublicationCommand;
import com.vinnot.review.application.port.out.ReviewModerationNotifier;
import com.vinnot.review.application.port.out.ReviewPublicationRepositoryPort;
import com.vinnot.review.application.port.out.ReviewRepositoryPort;
import com.vinnot.review.application.port.out.WineCommandPort;
import com.vinnot.review.domain.model.PublicationStatus;
import com.vinnot.review.domain.model.ReviewPublication;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import com.vinnot.review.domain.model.PublicationRejectionReason;
import java.util.UUID;

class DecideReviewPublicationCommandHandlerTest {
    private final ReviewPointsPort points = mock(ReviewPointsPort.class);
    @Test
    void locksBeforeDecisionRejectsStaleContentAndRefreshesOnlyReviewAggregates() {
        var publications = mock(ReviewPublicationRepositoryPort.class);
        var reviews = mock(ReviewRepositoryPort.class);
        var wines = mock(WineCommandPort.class);
        var notifier = mock(ReviewModerationNotifier.class);
        var activity = mock(CommentActivityAnnouncer.class);
        var handler = new DecideReviewPublicationCommandHandler(publications, reviews, wines, notifier, activity, points,
                mock(ReviewLikeRepositoryPort.class));
        UUID id = UUID.randomUUID(),
                author = UUID.randomUUID(),
                reviewer = UUID.randomUUID(),
                wine = UUID.randomUUID();
        Instant revision = Instant.now();
        var command =
                new DecideReviewPublicationCommand(
                        ReviewPublication.Type.REVIEW,
                        id,
                        reviewer,
                        PublicationStatus.APPROVED,
                        null,
                        "",
                        revision);
        assertThatThrownBy(() -> handler.execute(command))
                .isInstanceOf(EntityNotFoundException.class);
        when(publications.findWineId(command.type(), id)).thenReturn(Optional.of(wine));
        assertThatThrownBy(() -> handler.execute(command))
                .isInstanceOf(EntityNotFoundException.class);
        var content =
                new ReviewPublication(
                        command.type(),
                        id,
                        wine,
                        id,
                        author,
                        BigDecimal.valueOf(4),
                        "Title",
                        "Text",
                        PublicationStatus.PENDING,
                        revision,
                        revision,
                        true);
        when(publications.findForUpdate(command.type(), id)).thenReturn(Optional.of(content));
        assertThatThrownBy(
                        () ->
                                handler.execute(
                                        new DecideReviewPublicationCommand(
                                                command.type(),
                                                id,
                                                reviewer,
                                                PublicationStatus.APPROVED,
                                                null,
                                                "",
                                                revision.minusSeconds(1))))
                .isInstanceOf(BusinessRuleViolationException.class);
        verify(publications, never()).decide(any(), any(), any(), any(), any());
        when(reviews.getAverageRatingByWineId(wine)).thenReturn(4.0);
        when(reviews.countByWineId(wine)).thenReturn(1L);
        clearInvocations(publications, wines);
        handler.execute(command);
        var order = inOrder(publications, wines);
        order.verify(publications).findWineId(command.type(), id);
        order.verify(wines).lockRatingStats(wine);
        order.verify(publications).findForUpdate(command.type(), id);
        order.verify(publications).decide(any(), any(), any(), any(), any());
        verify(wines).updateRatingStats(wine, new BigDecimal("4.00"), 1);
        verify(notifier).publicationDecided(eq(content),
                eq(PublicationStatus.APPROVED),
                eq(new ReviewPublication.Decision(null, "")), any());
        verify(activity, never()).commentPublished(any());
        var comment =
                new ReviewPublication(
                        ReviewPublication.Type.COMMENT,
                        id,
                        wine,
                        id,
                        author,
                        null,
                        "",
                        "Comment",
                        PublicationStatus.PENDING,
                        revision,
                        revision,
                        true);
        when(publications.findWineId(comment.type(), id)).thenReturn(Optional.of(wine));
        when(publications.findForUpdate(comment.type(), id)).thenReturn(Optional.of(comment));
        clearInvocations(wines);
        handler.execute(
                new DecideReviewPublicationCommand(
                        comment.type(),
                        id,
                        reviewer,
                        PublicationStatus.REJECTED,
                        null,
                        "Spam",
                        revision));
        verify(wines, never()).updateRatingStats(any(), any(), anyInt());
        verify(notifier).publicationDecided(eq(comment),
                eq(PublicationStatus.REJECTED),
                eq(new ReviewPublication.Decision(
                        PublicationRejectionReason.OTHER, "Spam", true)), any());
        verify(activity, never()).commentPublished(any());
        handler.execute(
                new DecideReviewPublicationCommand(
                        comment.type(),
                        id,
                        reviewer,
                        PublicationStatus.APPROVED,
                        null,
                        "",
                        revision));
        verify(activity).commentPublished(comment);
    }
}
