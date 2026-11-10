package com.vinnot.wine.application.command.handler;

import com.vinnot.wine.application.service.WineLabelScanRecorder;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.wine.application.command.model.ScanWineLabelCommand;
import com.vinnot.wine.application.port.out.WineLabelRecognitionPort;
import com.vinnot.wine.application.port.out.WineLabelMetricsPort;
import com.vinnot.wine.application.service.WineLabelCatalogMatcher;
import com.vinnot.wine.application.service.WineLabelScanPolicy;
import com.vinnot.wine.domain.model.ExtractedWineLabel;
import com.vinnot.wine.domain.model.RankedWineLabelCandidate;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.model.WineLabelCandidate;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.vinnot.wine.application.port.out.WineLabelAliasPort;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.port.out.WineryQueryPort;
import com.vinnot.wine.application.service.WineLabelCandidateRetriever;
import com.vinnot.wine.domain.service.WineLabelMatchScorer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class ScanWineLabelCommandHandlerTest {
    private final WineLabelScanRecorder scanRecorder = mock(WineLabelScanRecorder.class);

    @Mock
    private WineLabelRecognitionPort recognitionPort;
    @Mock
    private WineLabelCatalogMatcher catalogMatcher;
    @Mock
    private WineLabelMetricsPort metricsPort;

    private ScanWineLabelCommandHandler handler;

    @BeforeEach
    void setUp() {
        handler = new ScanWineLabelCommandHandler(
                recognitionPort, catalogMatcher, metricsPort,
                new WineLabelScanPolicy(), scanRecorder);
    }

    @Test
    void realDomainMatcherRecognizesCompleteOcrIdentityWithoutAnyVisualCall() {
        var wines = mock(WineRepositoryPort.class);
        var wineries = mock(WineryQueryPort.class);
        var aliases = mock(WineLabelAliasPort.class);
        var wine = Wine.create("Black Tears Malbec", UUID.randomUUID(), WineType.RED, UUID.randomUUID());
        wine.updateGrapes(List.of("Malbec"));
        when(wines.findByIndexedIdentity(any())).thenReturn(List.of(wine));
        when(wineries.findAllByIds(any())).thenReturn(List.of(
                new WineryQueryPort.WineryData(wine.getWineryId(), "Tapiz",
                        null, null, null, null, null, null, null, null, null, null, null, null)));
        var matcher = new WineLabelCatalogMatcher(
                new WineLabelCandidateRetriever(wines), wineries,
                new WineLabelMatchScorer(), aliases);
        var useCase = new ScanWineLabelCommandHandler(recognitionPort, matcher, metricsPort, new WineLabelScanPolicy(), scanRecorder);
        var result = useCase.execute(command(List.of("TAPIZ", "BLACK TEARS", "MALBEC", "2020")));
        assertThat(result.outcome().name()).isEqualTo("EXACT_MATCH");
        assertThat(result.wine().id()).isEqualTo(wine.getId());
        verifyNoInteractions(recognitionPort);
    }

    @Test
    void optionalOcrCatalogTimeoutCanRecoverThroughVisualIdentity() {
        var failure = new ExternalServiceUnavailableException("LABEL_CATALOG_UNAVAILABLE", "timeout", null);
        when(catalogMatcher.match(any(), any())).thenThrow(failure).thenReturn(exactMatch());
        when(recognitionPort.recognize(any(), any(), any())).thenReturn(label(List.of("FORASTERO", "MALBEC")));
        assertThat(handler.execute(command(List.of("noisy OCR"))).outcome().name()).isEqualTo("EXACT_MATCH");
        verify(metricsPort).recordScanStage(eq(WineLabelMetricsPort.ScanStage.LOCAL_CATALOG),
                any(Duration.class), eq(false));
    }

    @Test
    void exhaustedLocalBudgetPreservesTimeForVisualRecognition() {
        var failure = new ExternalServiceUnavailableException("LABEL_SCAN_TIMEOUT", "deadline", null);
        when(catalogMatcher.match(any(), any())).thenThrow(failure).thenReturn(exactMatch());
        when(recognitionPort.recognize(any(), any(), any())).thenReturn(label(List.of("FORASTERO", "MALBEC")));
        assertThat(handler.execute(command(List.of("noisy OCR"))).outcome().name()).isEqualTo("EXACT_MATCH");
        verify(recognitionPort).recognize(any(), any(), argThat(
                remaining -> remaining.compareTo(Duration.ofSeconds(3)) > 0));
    }

    @Test
    void unrelatedLocalFailureIsNotHiddenByVisualFallback() {
        var failure = new ExternalServiceUnavailableException("OTHER_SERVICE_FAILURE", "unavailable", null);
        when(catalogMatcher.match(any(), any())).thenThrow(failure);
        assertThatThrownBy(() -> handler.execute(command(List.of("noisy OCR")))).isSameAs(failure);
        verifyNoInteractions(recognitionPort);
    }

    @Test
    void aSignedInMembersScanIsRecordedAndARecordingFailureNeverHidesTheResult() {
        when(catalogMatcher.match(any(), any())).thenReturn(exactMatch());
        UUID member = UUID.randomUUID();
        ScanWineLabelCommand anonymous = command(List.of("FORASTERO", "SMALL BATCH", "MALBEC"));
        ScanWineLabelCommand signedIn = new ScanWineLabelCommand(
                anonymous.imageBytes(), anonymous.contentType(), anonymous.observedText(), member);

        var result = handler.execute(signedIn);
        verify(scanRecorder).record(member, result);

        doThrow(new IllegalStateException("database unavailable")).when(scanRecorder).record(any(), any());
        assertThat(handler.execute(signedIn).outcome().name()).isEqualTo("EXACT_MATCH");
        handler.execute(anonymous);
        verify(scanRecorder, times(2)).record(any(), any());
    }

    @Test
    void returnsAnExactLocalOcrMatchWithoutCallingVisualRecognition() {
        ExtractedWineLabel localLabel = label(List.of("FORASTERO", "SMALL BATCH", "MALBEC"));
        WineLabelCatalogMatcher.MatchResult exactMatch = exactMatch();
        when(catalogMatcher.match(any(), any())).thenReturn(exactMatch);

        var result = handler.execute(command(localLabel.observedText()));

        assertThat(result.outcome().name()).isEqualTo("EXACT_MATCH");
        assertThat(result.confidence()).isEqualTo(0.96);
        verify(recognitionPort, never()).recognize(any(), any(), any());
    }

    @Test
    void verifiesLocalOcrSuggestionsWithVisualRecognitionBeforeResponding() {
        ExtractedWineLabel visualLabel = label(List.of("BAD BROTHERS", "FACON"));
        when(catalogMatcher.match(any(), any()))
                .thenReturn(possibleMatch(0.72))
                .thenReturn(exactMatch());
        when(recognitionPort.recognize(any(), any(), any())).thenReturn(visualLabel);

        var result = handler.execute(command(List.of("BAD BROTHERS", "FACON")));

        assertThat(result.outcome().name()).isEqualTo("EXACT_MATCH");
        verify(recognitionPort).recognize(any(), any(), any());
    }

    @Test
    void mergesLocalOcrEvidenceBeforeMatchingTheVisualRecognitionResult() {
        ExtractedWineLabel visualLabel = label(List.of("MALBEC"));
        when(catalogMatcher.match(any(), any()))
                .thenReturn(noMatch())
                .thenReturn(exactMatch());
        when(recognitionPort.recognize(any(), any(), any())).thenReturn(visualLabel);

        var result = handler.execute(command(List.of("FORASTERO", "SMALL BATCH")));

        assertThat(result.outcome().name()).isEqualTo("EXACT_MATCH");
        ArgumentCaptor<ExtractedWineLabel> labelCaptor =
                ArgumentCaptor.forClass(ExtractedWineLabel.class);
        verify(catalogMatcher, times(2))
                .match(labelCaptor.capture(), any());
        assertThat(labelCaptor.getAllValues().get(1).observedText())
                .containsExactly("FORASTERO", "SMALL BATCH", "MALBEC");
        verify(recognitionPort).recognize(any(), any(), any());
    }

    @Test
    void usesVisualRecognitionDirectlyWhenTheClientHasNoOcrEvidence() {
        ExtractedWineLabel visualLabel = label(List.of("NORTON", "COSECHA TARDIA"));
        when(recognitionPort.recognize(any(), any(), any())).thenReturn(visualLabel);
        when(catalogMatcher.match(any(), any())).thenReturn(exactMatch());

        var result = handler.execute(command(List.of()));

        assertThat(result.outcome().name()).isEqualTo("EXACT_MATCH");
        verify(catalogMatcher).match(eq(visualLabel), any());
        verify(recognitionPort).recognize(any(), any(), any());
    }

    @Test
    void returnsPossibleMatchesWithoutPromotingAnAmbiguousCandidateToExact() {
        ExtractedWineLabel visualLabel = label(List.of("BAD BROTHERS", "FACON"));
        when(recognitionPort.recognize(any(), any(), any())).thenReturn(visualLabel);
        when(catalogMatcher.match(any(), any())).thenReturn(possibleMatch(0.83));

        var result = handler.execute(command(List.of()));

        assertThat(result.outcome().name()).isEqualTo("POSSIBLE_MATCHES");
        assertThat(result.wine()).isNull();
        assertThat(result.suggestions()).hasSize(1);
        assertThat(result.candidates().getFirst().score()).isEqualTo(0.83);
    }

    @Test
    void capsAmbiguousCandidateConfidenceBelowExactMatchConfidence() {
        ExtractedWineLabel visualLabel = label(List.of("EL ESTECO", "CABERNET"));
        when(recognitionPort.recognize(any(), any(), any())).thenReturn(visualLabel);
        when(catalogMatcher.match(any(), any())).thenReturn(possibleMatch(1.0));

        var result = handler.execute(command(List.of()));

        assertThat(result.outcome().name()).isEqualTo("POSSIBLE_MATCHES");
        assertThat(result.confidence()).isEqualTo(0.89);
        assertThat(result.candidates().getFirst().score()).isEqualTo(0.89);
    }

    @Test
    void returnsNoMatchWhenNeitherTextNorVisualEvidenceFindsCandidates() {
        ExtractedWineLabel visualLabel = label(List.of("UNKNOWN LABEL"));
        when(catalogMatcher.match(any(), any())).thenReturn(noMatch());
        when(recognitionPort.recognize(any(), any(), any())).thenReturn(visualLabel);

        var result = handler.execute(command(List.of("UNKNOWN")));

        assertThat(result.outcome().name()).isEqualTo("NO_MATCH");
        assertThat(result.confidence()).isZero();
        assertThat(result.suggestions()).isEmpty();
        assertThat(result.candidates()).isEmpty();
    }

    @Test
    void recordsFailedStageAndPropagatesRecognitionFailure() {
        IllegalStateException failure = new IllegalStateException("provider offline");
        when(recognitionPort.recognize(any(), any(), any())).thenThrow(failure);

        assertThatThrownBy(() -> handler.execute(command(List.of())))
                .isSameAs(failure);

        verify(metricsPort).recordScanStage(
                eq(WineLabelMetricsPort.ScanStage.VISUAL_RECOGNITION),
                any(Duration.class), eq(false));
    }

    @Test
    void doesNotPresentAnUnverifiedLocalResultWhenVisualRecognitionIsUnavailable() {
        ExternalServiceUnavailableException failure =
                new ExternalServiceUnavailableException(
                        "LABEL_RECOGNITION_UNAVAILABLE",
                        "provider offline",
                        null);
        when(catalogMatcher.match(any(), any())).thenReturn(noMatch());
        when(recognitionPort.recognize(any(), any(), any())).thenThrow(failure);

        assertThatThrownBy(() -> handler.execute(
                command(List.of("BLACK TEARS", "TAPIZ"))))
                .isSameAs(failure);
        verify(metricsPort).recordScanStage(
                eq(WineLabelMetricsPort.ScanStage.VISUAL_RECOGNITION),
                any(Duration.class), eq(false));
    }

    @Test
    void propagatesRecognitionUnavailabilityWithoutLocalOcrEvidence() {
        ExternalServiceUnavailableException failure =
                new ExternalServiceUnavailableException(
                        "LABEL_RECOGNITION_UNAVAILABLE",
                        "provider offline",
                        null);
        when(recognitionPort.recognize(any(), any(), any())).thenThrow(failure);

        assertThatThrownBy(() -> handler.execute(command(List.of())))
                .isSameAs(failure);
    }

    private ScanWineLabelCommand command(List<String> observedText) {
        return new ScanWineLabelCommand(
                new byte[] {1, 2, 3},
                "image/jpeg",
                observedText);
    }

    private WineLabelCatalogMatcher.MatchResult exactMatch() {
        Wine wine = Wine.create(
                "Small Batch Malbec",
                UUID.randomUUID(),
                WineType.RED,
                UUID.randomUUID());
        RankedWineLabelCandidate candidate = new RankedWineLabelCandidate(
                new WineLabelCandidate(wine, "Forastero"),
                0.96);
        return new WineLabelCatalogMatcher.MatchResult(
                List.of(candidate),
                Map.of(),
                true);
    }

    private WineLabelCatalogMatcher.MatchResult noMatch() {
        return new WineLabelCatalogMatcher.MatchResult(
                List.of(),
                Map.of(),
                false);
    }

    private WineLabelCatalogMatcher.MatchResult possibleMatch(double score) {
        Wine wine = Wine.create(
                "Facón Selection Cabernet Sauvignon",
                UUID.randomUUID(),
                WineType.RED,
                UUID.randomUUID());
        RankedWineLabelCandidate candidate = new RankedWineLabelCandidate(
                new WineLabelCandidate(wine, "Bad Brothers"), score);
        return new WineLabelCatalogMatcher.MatchResult(
                List.of(candidate), Map.of(), false);
    }

    private ExtractedWineLabel label(List<String> observedText) {
        return new ExtractedWineLabel(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                0.95,
                null,
                null,
                true,
                observedText);
    }
}
