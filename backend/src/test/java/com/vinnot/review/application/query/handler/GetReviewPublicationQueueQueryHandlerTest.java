package com.vinnot.review.application.query.handler;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vinnot.review.application.port.out.ReviewPublicationRepositoryPort;
import com.vinnot.review.application.port.out.ReviewPublicationRepositoryPort.PublicationNames;
import com.vinnot.review.domain.model.PublicationStatus;
import com.vinnot.review.domain.model.ReviewPublication;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

class GetReviewPublicationQueueQueryHandlerTest {
    @Test
    void boundsThePrivateQueueBeforeReadingIt() {
        var repository = mock(ReviewPublicationRepositoryPort.class);
        UUID reviewer = UUID.randomUUID();
        when(repository.pending(eq(reviewer), any()))
                .thenReturn(PageResult.of(List.of(), 0, 50, 0));
        assertThat(
                        new GetReviewPublicationQueueQueryHandler(repository)
                                .execute(reviewer, 0, 50)
                                .content())
                .isEmpty();
        verify(repository).pending(reviewer, PageQuery.bounded(0, 50, 50));
        verify(repository, never()).findNames(any(), any());
    }

    @Test
    void namesAuthorsAndWinesWithOneLookupPerPage() {
        var repository = mock(ReviewPublicationRepositoryPort.class);
        UUID reviewer = UUID.randomUUID(), author = UUID.randomUUID(), gone = UUID.randomUUID();
        UUID wine = UUID.randomUUID(), missingWine = UUID.randomUUID();
        Instant now = Instant.parse("2026-10-25T10:00:00Z");
        var review =
                new ReviewPublication(
                        ReviewPublication.Type.REVIEW,
                        UUID.randomUUID(),
                        wine,
                        UUID.randomUUID(),
                        author,
                        BigDecimal.valueOf(4),
                        "Title",
                        "Body",
                        PublicationStatus.PENDING,
                        now,
                        now,
                        true);
        var comment =
                new ReviewPublication(
                        ReviewPublication.Type.COMMENT,
                        UUID.randomUUID(),
                        missingWine,
                        review.id(),
                        gone,
                        null,
                        "",
                        "Reply",
                        PublicationStatus.PENDING,
                        now,
                        now,
                        false);
        when(repository.pending(eq(reviewer), any()))
                .thenReturn(PageResult.of(List.of(review, comment), 0, 20, 2));
        when(repository.findNames(any(), any()))
                .thenReturn(new PublicationNames(Map.of(author, "ana"), Map.of(wine, "Malbec")));

        var page = new GetReviewPublicationQueueQueryHandler(repository).execute(reviewer, 0, 20);

        verify(repository, times(1)).findNames(Set.of(author, gone), Set.of(wine, missingWine));
        var first = page.content().get(0);
        assertThat(first.authorUsername()).isEqualTo("ana");
        assertThat(first.wineName()).isEqualTo("Malbec");
        // Existing fields stay exactly as the publication holds them.
        assertThat(first.type()).isEqualTo(ReviewPublication.Type.REVIEW);
        assertThat(first.id()).isEqualTo(review.id());
        assertThat(first.wineId()).isEqualTo(wine);
        assertThat(first.reviewId()).isEqualTo(review.reviewId());
        assertThat(first.authorId()).isEqualTo(author);
        assertThat(first.rating()).isEqualTo(BigDecimal.valueOf(4));
        assertThat(first.title()).isEqualTo("Title");
        assertThat(first.content()).isEqualTo("Body");
        assertThat(first.status()).isEqualTo(PublicationStatus.PENDING);
        assertThat(first.createdAt()).isEqualTo(now);
        assertThat(first.updatedAt()).isEqualTo(now);
        assertThat(first.parentApproved()).isTrue();
        var second = page.content().get(1);
        assertThat(second.authorUsername()).isNull();
        assertThat(second.wineName()).isNull();
        assertThat(second.parentApproved()).isFalse();
    }
}
