package com.vinnot.review.application.command.handler;

import static org.mockito.Mockito.mock;
import com.vinnot.review.application.port.out.ReviewPointsPort;
import com.vinnot.review.application.command.model.UpdateReviewCommand;
import com.vinnot.review.application.port.out.CellarCommandPort;
import com.vinnot.review.application.port.out.ReviewRepositoryPort;
import com.vinnot.review.application.port.out.WineCommandPort;
import com.vinnot.review.application.query.handler.ReviewerInfoResolver;
import com.vinnot.review.application.query.response.ReviewResponse;
import com.vinnot.review.domain.model.PublicationStatus;
import com.vinnot.review.domain.model.Review;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UpdateReviewCommandHandlerTest {
    private final ReviewPointsPort points = mock(ReviewPointsPort.class);

    private static final UUID WINE_ID = UUID.randomUUID();
    private static final UUID AUTHOR_ID = UUID.randomUUID();

    @Mock
    private ReviewRepositoryPort repository;
    @Mock
    private WineCommandPort wineCommandPort;
    @Mock
    private CellarCommandPort cellarCommandPort;
    @Mock
    private ReviewerInfoResolver reviewerInfoResolver;

    private UpdateReviewCommandHandler handler;

    @BeforeEach
    void setUp() {
        handler = new UpdateReviewCommandHandler(
                repository, wineCommandPort, cellarCommandPort, reviewerInfoResolver, points);
        lenient().when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(repository.countByWineId(WINE_ID)).thenReturn(1L);
        lenient().when(repository.getAverageRatingByWineId(WINE_ID)).thenReturn(4.0);
    }

    @Test
    void authorFullEditKeepsApprovedReviewPublicAndSyncsCellar() {
        Review review = stored(PublicationStatus.APPROVED);

        ReviewResponse response = handler.execute(new UpdateReviewCommand(
                review.getId(), AUTHOR_ID, false, new BigDecimal("3.5"), "New title", "New notes", null, false));

        assertThat(review.getRating()).isEqualByComparingTo("3.5");
        assertThat(review.getTitle()).isEqualTo("New title");
        assertThat(review.getComment()).isEqualTo("New notes");
        assertThat(review.getPublicationStatus()).isEqualTo(PublicationStatus.APPROVED);
        assertThat(response).isNotNull();
        verify(wineCommandPort).lockRatingStats(WINE_ID);
        verify(wineCommandPort).updateRatingStats(WINE_ID, new BigDecimal("4.00"), 1);
        verify(cellarCommandPort).syncReviewToCellar(AUTHOR_ID, WINE_ID, new BigDecimal("3.5"), "New notes", null);
    }

    @Test
    void editWithoutRatingKeepsRatingInsteadOfFailing() {
        Review review = stored(PublicationStatus.APPROVED);

        handler.execute(new UpdateReviewCommand(
                review.getId(), AUTHOR_ID, false, null, "Only title and notes", "Fresh notes", null, false));

        assertThat(review.getRating()).isEqualByComparingTo("4.5");
        assertThat(review.getTitle()).isEqualTo("Only title and notes");
        assertThat(review.getComment()).isEqualTo("Fresh notes");
        verify(cellarCommandPort).syncReviewToCellar(AUTHOR_ID, WINE_ID, new BigDecimal("4.5"), "Fresh notes", null);
    }

    @Test
    void omittedFieldsAreKeptAndCellarNotesAreNotOverwritten() {
        Review review = stored(PublicationStatus.APPROVED);

        handler.execute(new UpdateReviewCommand(
                review.getId(), AUTHOR_ID, false, new BigDecimal("2.0"), null, null, null, false));

        assertThat(review.getRating()).isEqualByComparingTo("2.0");
        assertThat(review.getTitle()).isEqualTo("Original title");
        assertThat(review.getComment()).isEqualTo("Original comment");
        verify(cellarCommandPort).syncReviewRatingToCellar(AUTHOR_ID, WINE_ID, new BigDecimal("2.0"), null);
        verify(cellarCommandPort, never()).syncReviewToCellar(any(), any(), any(), any(), any());
    }

    @Test
    void titleOnlyEditDoesNotTouchTheCellar() {
        Review review = stored(PublicationStatus.APPROVED);

        handler.execute(new UpdateReviewCommand(
                review.getId(), AUTHOR_ID, false, null, "Renamed", null, null, false));

        assertThat(review.getTitle()).isEqualTo("Renamed");
        assertThat(review.getComment()).isEqualTo("Original comment");
        verifyNoInteractions(cellarCommandPort);
    }

    @Test
    void editedRejectedReviewIsQueuedForModerationInsteadOfPublished() {
        Review review = stored(PublicationStatus.REJECTED);

        handler.execute(new UpdateReviewCommand(
                review.getId(), AUTHOR_ID, false, new BigDecimal("4.0"), "Edited", "Edited notes", null, false));

        assertThat(review.getPublicationStatus()).isEqualTo(PublicationStatus.PENDING);
        verify(wineCommandPort).updateRatingStats(WINE_ID, new BigDecimal("4.00"), 1);
    }

    @Test
    void pendingReviewStaysPendingAfterEdit() {
        Review review = stored(PublicationStatus.PENDING);

        handler.execute(new UpdateReviewCommand(
                review.getId(), AUTHOR_ID, false, null, null, "Edited notes", null, false));

        assertThat(review.getPublicationStatus()).isEqualTo(PublicationStatus.PENDING);
    }

    @Test
    void administratorEditDoesNotOverwriteTheAuthorsCellar() {
        Review review = stored(PublicationStatus.APPROVED);

        handler.execute(new UpdateReviewCommand(
                review.getId(), UUID.randomUUID(), true, new BigDecimal("1.0"), "Moderated", "Moderated text", null, false));

        assertThat(review.getComment()).isEqualTo("Moderated text");
        verifyNoInteractions(cellarCommandPort);
    }

    @Test
    void editWithoutVintageKeepsTheStoredVintageAndLeavesTheCellarVintageUntouched() {
        Review review = stored(PublicationStatus.APPROVED);
        review.updateVintage(2018);

        ReviewResponse response = handler.execute(new UpdateReviewCommand(
                review.getId(), AUTHOR_ID, false, new BigDecimal("4.0"), null, "Notes", null, false));

        assertThat(review.getVintage()).isEqualTo(2018);
        assertThat(response.vintage()).isEqualTo(2018);
        verify(cellarCommandPort).syncReviewToCellar(AUTHOR_ID, WINE_ID, new BigDecimal("4.0"), "Notes", null);
    }

    @Test
    void newVintageReplacesTheStoredOneAndSyncsItWithRatingAndNotes() {
        Review review = stored(PublicationStatus.APPROVED);
        review.updateVintage(2018);

        ReviewResponse response = handler.execute(new UpdateReviewCommand(
                review.getId(), AUTHOR_ID, false, new BigDecimal("4.0"), null, "Notes", 2019, false));

        assertThat(review.getVintage()).isEqualTo(2019);
        assertThat(response.vintage()).isEqualTo(2019);
        verify(cellarCommandPort).syncReviewToCellar(AUTHOR_ID, WINE_ID, new BigDecimal("4.0"), "Notes", 2019);
    }

    @Test
    void vintageOnlyEditSyncsTheVintageWithTheCurrentRating() {
        Review review = stored(PublicationStatus.APPROVED);

        handler.execute(new UpdateReviewCommand(
                review.getId(), AUTHOR_ID, false, null, null, null, 2020, false));

        assertThat(review.getVintage()).isEqualTo(2020);
        assertThat(review.getComment()).isEqualTo("Original comment");
        verify(cellarCommandPort).syncReviewRatingToCellar(AUTHOR_ID, WINE_ID, new BigDecimal("4.5"), 2020);
        verify(cellarCommandPort, never()).syncReviewToCellar(any(), any(), any(), any(), any());
    }

    @Test
    void clearVintageRemovesItWithoutTouchingTheCellar() {
        Review review = stored(PublicationStatus.APPROVED);
        review.updateVintage(2018);

        ReviewResponse response = handler.execute(new UpdateReviewCommand(
                review.getId(), AUTHOR_ID, false, null, null, null, null, true));

        assertThat(review.getVintage()).isNull();
        assertThat(response.vintage()).isNull();
        verifyNoInteractions(cellarCommandPort);
    }

    @Test
    void clearVintageWinsOverASuppliedVintage() {
        Review review = stored(PublicationStatus.APPROVED);
        review.updateVintage(2018);

        handler.execute(new UpdateReviewCommand(
                review.getId(), AUTHOR_ID, false, new BigDecimal("3.0"), null, null, 2019, true));

        assertThat(review.getVintage()).isNull();
        verify(cellarCommandPort).syncReviewRatingToCellar(AUTHOR_ID, WINE_ID, new BigDecimal("3.0"), null);
    }

    private Review stored(PublicationStatus status) {
        Review review = Review.builder()
                .id(UUID.randomUUID())
                .wineId(WINE_ID)
                .userId(AUTHOR_ID)
                .rating(new BigDecimal("4.5"))
                .title("Original title")
                .comment("Original comment")
                .publicationStatus(status)
                .createdAt(Instant.parse("2026-01-01T00:00:00Z"))
                .updatedAt(Instant.parse("2026-01-01T00:00:00Z"))
                .build();
        when(repository.findWineId(review.getId())).thenReturn(Optional.of(WINE_ID));
        when(repository.findByIdForUpdate(review.getId())).thenReturn(Optional.of(review));
        return review;
    }
}
