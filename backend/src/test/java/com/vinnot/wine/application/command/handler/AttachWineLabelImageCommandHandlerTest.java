package com.vinnot.wine.application.command.handler;

import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wine.application.command.model.AttachWineLabelImageCommand;
import com.vinnot.wine.application.port.out.WineLabelRecognitionPort;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.port.out.WineSubmissionModerationPort;
import com.vinnot.wine.application.port.out.WineryQueryPort;
import com.vinnot.wine.application.service.WineLabelCatalogMatcher;
import com.vinnot.wine.domain.model.ExtractedWineLabel;
import com.vinnot.wine.domain.model.RankedWineLabelCandidate;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.model.WineContentSafetyReview;
import com.vinnot.wine.domain.model.WineLabelCandidate;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import com.vinnot.wine.application.service.WineLabelImagePublicationService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AttachWineLabelImageCommandHandlerTest {

    private WineRepositoryPort wines;
    private WineryQueryPort wineries;
    private WineLabelRecognitionPort recognition;
    private WineLabelCatalogMatcher matcher;
    private WineSubmissionModerationPort moderation;
    private FileStoragePort storage;
    private Wine wine;
    private AttachWineLabelImageCommand command;
    private ExtractedWineLabel extracted;

    @BeforeEach
    void setUp() {
        wines = mock(WineRepositoryPort.class);
        wineries = mock(WineryQueryPort.class);
        recognition = mock(WineLabelRecognitionPort.class);
        matcher = mock(WineLabelCatalogMatcher.class);
        moderation = mock(WineSubmissionModerationPort.class);
        storage = mock(FileStoragePort.class);
        wine = Wine.create("Reserva", UUID.randomUUID(), WineType.RED, UUID.randomUUID());
        wine.updateGrapes(List.of("Malbec"));
        command = new AttachWineLabelImageCommand(
                UUID.randomUUID(), wine.getId(), new byte[]{1, 2, 3}, "image/jpeg", "label.jpg");
        extracted = new ExtractedWineLabel("Winery", "Reserva", "Malbec", null,
                "RED", null, null, null, 0.95, "winery reserva", null, true,
                List.of("WINERY", "RESERVA"));
        when(wines.findById(wine.getId())).thenReturn(Optional.of(wine));
        when(wines.findByIdForUpdate(wine.getId())).thenReturn(Optional.of(wine));
        when(recognition.recognize(command.imageBytes(), command.contentType()))
                .thenReturn(extracted);
    }

    @Test
    void returnsExistingImageWithoutProviderCalls() {
        wine.updateImageUrl("https://images.test/existing.jpg");

        var response = handler().execute(command);

        assertThat(response.attached()).isFalse();
        assertThat(response.imageUrl()).isEqualTo("https://images.test/existing.jpg");
        verify(recognition, never()).recognize(any(), any());
    }

    @Test
    void validatesModeratesStoresAndAttachesSafeMatchingLabel() {
        when(matcher.match(extracted)).thenReturn(match(wine));
        when(wineries.findById(wine.getWineryId())).thenReturn(Optional.of(
                new WineryQueryPort.WineryData(wine.getWineryId(), "Winery", null, null,
                        null, null, null, null, null, null, null, null, null, null)));
        when(moderation.reviewSafety(any(), any(), any()))
                .thenReturn(new WineContentSafetyReview(true, true, null));
        when(storage.storeWineLabel(any(InputStream.class), any(), any(), anyLong(), any()))
                .thenReturn("/images/wines/label.jpg");

        var response = handler().execute(command);

        assertThat(response.attached()).isTrue();
        assertThat(wine.getImageUrl()).isEqualTo("/images/wines/label.jpg");
        verify(wines).save(wine);
    }

    @Test
    void rejectsNonLabelWrongCandidateAndUnsafeContent() {
        ExtractedWineLabel nonLabel = new ExtractedWineLabel(null, null, null, null,
                null, null, null, null, 0, null, null, false, List.of());
        when(recognition.recognize(command.imageBytes(), command.contentType())).thenReturn(nonLabel);
        when(matcher.match(nonLabel)).thenReturn(new WineLabelCatalogMatcher.MatchResult(
                List.of(), Map.of(), false));
        assertThatThrownBy(() -> handler().execute(command))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("LABEL_IMAGE_WINE_MISMATCH");

        Wine other = Wine.create("Other", null, WineType.RED, UUID.randomUUID());
        when(recognition.recognize(command.imageBytes(), command.contentType())).thenReturn(extracted);
        when(matcher.match(extracted)).thenReturn(match(other));
        assertThatThrownBy(() -> handler().execute(command))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("LABEL_IMAGE_WINE_MISMATCH");

        when(matcher.match(extracted)).thenReturn(match(wine));
        when(wineries.findById(wine.getWineryId())).thenReturn(Optional.empty());
        when(moderation.reviewSafety(any(), any(), any()))
                .thenReturn(new WineContentSafetyReview(false, false, "unavailable"));
        assertThatThrownBy(() -> handler().execute(command))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("LABEL_IMAGE_REVIEW_REQUIRED");
    }

    @Test
    void neverPublishesAnUncertainSuggestionEvenWhenItsScoreIsHigh() {
        var exact = match(wine);
        when(matcher.match(extracted)).thenReturn(new WineLabelCatalogMatcher.MatchResult(
                exact.ranked(), exact.wineries(), false));
        assertThatThrownBy(() -> handler().execute(command))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("LABEL_IMAGE_WINE_MISMATCH");
        verify(storage, never()).storeWineLabel(any(), any(), any(), anyLong(), any());
    }

    @Test
    void reportsMissingWine() {
        when(wines.findById(wine.getId())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> handler().execute(command))
                .isInstanceOf(EntityNotFoundException.class);
    }

    private WineLabelCatalogMatcher.MatchResult match(Wine candidate) {
        return new WineLabelCatalogMatcher.MatchResult(List.of(
                new RankedWineLabelCandidate(new WineLabelCandidate(candidate, "Winery"), 0.9)),
                Map.of(), true);
    }

    private AttachWineLabelImageCommandHandler handler() {
        return new AttachWineLabelImageCommandHandler(
                wines, wineries, recognition, matcher, moderation, storage,
                new WineLabelImagePublicationService(wines));
    }
}
