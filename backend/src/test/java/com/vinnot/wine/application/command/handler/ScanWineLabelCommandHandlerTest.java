package com.vinnot.wine.application.command.handler;

import com.vinnot.wine.application.query.response.WineLabelScanResponse;
import com.vinnot.wine.application.query.response.WineSummaryResponse;
import com.vinnot.wine.application.service.WineLabelScanRecorder;
import com.vinnot.wine.application.service.WineLabelCandidateVerifier;
import com.vinnot.wine.application.service.WineVisualIndexService;
import com.vinnot.wine.application.port.out.CatalogImageSourcePort;
import com.vinnot.wine.application.port.out.WineImageEmbeddingPort;
import com.vinnot.wine.application.port.out.WineImageEmbeddingRepositoryPort;
import com.vinnot.wine.application.port.out.WineLabelCandidateVerificationPort;
import com.vinnot.wine.application.port.out.WineVisualIndexPort;
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
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import com.vinnot.wine.application.port.out.WineLabelAliasPort;
import com.vinnot.wine.application.port.out.WineBarcodeConfirmationPort;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.port.out.WineryQueryPort;
import com.vinnot.wine.application.service.WineLabelCandidateRetriever;
import com.vinnot.wine.domain.service.WineLabelMatchScorer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
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
    private static final String BARCODE = "7791234567890";
    private final WineLabelScanRecorder scanRecorder = mock(WineLabelScanRecorder.class);
    private final WineVisualIndexService visualIndex = new WineVisualIndexService(
            mock(WineImageEmbeddingPort.class), mock(WineImageEmbeddingRepositoryPort.class),
            mock(CatalogImageSourcePort.class), mock(WineVisualIndexPort.class), Runnable::run, 0.6);
    private final WineLabelCandidateVerifier verifier =
            new WineLabelCandidateVerifier(mock(WineLabelCandidateVerificationPort.class), 0.85);

    @Mock
    private WineLabelRecognitionPort recognitionPort;
    @Mock
    private WineLabelCatalogMatcher catalogMatcher;
    @Mock
    private WineLabelMetricsPort metricsPort;
    private final WineBarcodeConfirmationPort barcodeConfirmations = mock(WineBarcodeConfirmationPort.class);
    private final WineRepositoryPort wineRepository = mock(WineRepositoryPort.class);
    private final WineryQueryPort wineryQuery = mock(WineryQueryPort.class);

    private ScanWineLabelCommandHandler handler;

    @BeforeEach
    void setUp() {
        handler = new ScanWineLabelCommandHandler(
                recognitionPort, catalogMatcher, metricsPort,
                new WineLabelScanPolicy(), scanRecorder, visualIndex, verifier,
                barcodeConfirmations, wineRepository, wineryQuery);
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
        var useCase = new ScanWineLabelCommandHandler(recognitionPort, matcher, metricsPort, new WineLabelScanPolicy(), scanRecorder,
                visualIndex, verifier, barcodeConfirmations, wineRepository, wineryQuery);
        var result = useCase.execute(command(List.of("TAPIZ", "BLACK TEARS", "MALBEC", "2020")));
        assertThat(result.outcome().name()).isEqualTo("EXACT_MATCH");
        assertThat(result.wine().id()).isEqualTo(wine.getId());
        verifyNoInteractions(recognitionPort);
    }

    @Test
    void optionalOcrCatalogTimeoutCanRecoverThroughVisualIdentity() {
        var failure = new ExternalServiceUnavailableException("LABEL_CATALOG_UNAVAILABLE", "timeout", null);
        when(catalogMatcher.match(any(), any(), any())).thenThrow(failure).thenReturn(exactMatch());
        when(recognitionPort.recognize(any(), any(), any())).thenReturn(label(List.of("FORASTERO", "MALBEC")));
        assertThat(handler.execute(command(List.of("noisy OCR"))).outcome().name()).isEqualTo("EXACT_MATCH");
        verify(metricsPort).recordScanStage(eq(WineLabelMetricsPort.ScanStage.LOCAL_CATALOG),
                any(Duration.class), eq(false));
    }

    @Test
    void exhaustedLocalBudgetPreservesTimeForVisualRecognition() {
        var failure = new ExternalServiceUnavailableException("LABEL_SCAN_TIMEOUT", "deadline", null);
        when(catalogMatcher.match(any(), any(), any())).thenThrow(failure).thenReturn(exactMatch());
        when(recognitionPort.recognize(any(), any(), any())).thenReturn(label(List.of("FORASTERO", "MALBEC")));
        assertThat(handler.execute(command(List.of("noisy OCR"))).outcome().name()).isEqualTo("EXACT_MATCH");
        verify(recognitionPort).recognize(any(), any(), argThat(
                remaining -> remaining.compareTo(Duration.ofSeconds(3)) > 0));
    }

    @Test
    void unrelatedLocalFailureIsNotHiddenByVisualFallback() {
        var failure = new ExternalServiceUnavailableException("OTHER_SERVICE_FAILURE", "unavailable", null);
        when(catalogMatcher.match(any(), any(), any())).thenThrow(failure);
        assertThatThrownBy(() -> handler.execute(command(List.of("noisy OCR")))).isSameAs(failure);
        verifyNoInteractions(recognitionPort);
    }

    @Test
    void aSignedInMembersScanIsRecordedAndARecordingFailureNeverHidesTheResult() {
        when(catalogMatcher.match(any(), any(), any())).thenReturn(exactMatch());
        UUID member = UUID.randomUUID();
        ScanWineLabelCommand anonymous = command(List.of("FORASTERO", "SMALL BATCH", "MALBEC"));
        ScanWineLabelCommand signedIn = new ScanWineLabelCommand(
                anonymous.imageBytes(), anonymous.contentType(), anonymous.observedText(), member);

        UUID scanId = UUID.randomUUID();
        when(scanRecorder.record(eq(member), any(), isNull())).thenReturn(scanId);
        var result = handler.execute(signedIn);
        assertThat(result.scanId()).isEqualTo(scanId);
        verify(scanRecorder).record(member, result.withScanId(null), null);

        doThrow(new IllegalStateException("database unavailable")).when(scanRecorder).record(any(), any(), any());
        var unrecorded = handler.execute(signedIn);
        assertThat(unrecorded.outcome().name()).isEqualTo("EXACT_MATCH");
        assertThat(unrecorded.scanId()).isNull();
        assertThat(handler.execute(anonymous).scanId()).isNull();
        verify(scanRecorder, times(2)).record(any(), any(), any());
    }

    @Test
    void aCrowdConfirmedBarcodeIsAnExactMatchWithoutCallingAi() {
        Wine wine = Wine.create("Gran Malbec", UUID.randomUUID(), WineType.RED, UUID.randomUUID());
        when(barcodeConfirmations.findCrowdConfirmedWine(BARCODE, 2)).thenReturn(Optional.of(wine.getId()));
        when(wineRepository.findById(wine.getId())).thenReturn(Optional.of(wine));
        when(wineryQuery.findById(wine.getWineryId())).thenReturn(Optional.of(new WineryQueryPort.WineryData(
                wine.getWineryId(), "Bodega Norte", null, null, null, null, null, null, null, null, null, null, null,
                null)));
        UUID member = UUID.randomUUID();
        UUID scanId = UUID.randomUUID();
        when(scanRecorder.recordBarcodeAnswer(eq(member), any())).thenReturn(scanId);

        var result = handler.execute(barcodeCommand(member, List.of("GRAN MALBEC")));

        assertThat(result.outcome().name()).isEqualTo("EXACT_MATCH");
        assertThat(result.confidence()).isEqualTo(1.0);
        assertThat(result.wine().id()).isEqualTo(wine.getId());
        assertThat(result.wine().wineryName()).isEqualTo("Bodega Norte");
        assertThat(result.suggestions()).isEmpty();
        assertThat(result.candidates()).singleElement()
                .satisfies(candidate -> assertThat(candidate.score()).isEqualTo(1.0));
        assertThat(result.extractedData().observedText()).containsExactly("GRAN MALBEC");
        assertThat(result.scanId()).isEqualTo(scanId);
        verifyNoInteractions(recognitionPort, catalogMatcher);
        verify(scanRecorder, never()).record(any(), any(), any());
        verify(metricsPort).recordScan(eq(WineLabelScanResponse.Outcome.EXACT_MATCH), any(Duration.class), eq(false));
    }

    @Test
    void aBarcodeAnswerIsGivenEvenWhenItCannotBeRecorded() {
        Wine wine = Wine.create("Gran Malbec", null, WineType.RED, UUID.randomUUID());
        when(barcodeConfirmations.findCrowdConfirmedWine(BARCODE, 2)).thenReturn(Optional.of(wine.getId()));
        when(wineRepository.findById(wine.getId())).thenReturn(Optional.of(wine));
        UUID member = UUID.randomUUID();
        when(scanRecorder.recordBarcodeAnswer(eq(member), any())).thenThrow(new IllegalStateException("db down"));

        var anonymous = handler.execute(barcodeCommand(null, List.of()));
        var unrecorded = handler.execute(barcodeCommand(member, List.of()));

        assertThat(anonymous.wine().id()).isEqualTo(wine.getId());
        assertThat(anonymous.scanId()).isNull();
        assertThat(unrecorded.wine().id()).isEqualTo(wine.getId());
        assertThat(unrecorded.scanId()).isNull();
        verify(scanRecorder).recordBarcodeAnswer(eq(member), any());
        verifyNoInteractions(recognitionPort, catalogMatcher);
    }

    @Test
    void aBarcodeWithoutACrowdConfirmedWineContinuesTheScanAsBefore() {
        when(barcodeConfirmations.findCrowdConfirmedWine(BARCODE, 2)).thenReturn(Optional.empty());
        when(recognitionPort.recognize(any(), any(), any())).thenReturn(label(List.of("NORTON")));
        when(catalogMatcher.match(any(), any(), any())).thenReturn(exactMatch());
        UUID member = UUID.randomUUID();

        var result = handler.execute(barcodeCommand(member, List.of()));

        assertThat(result.outcome().name()).isEqualTo("EXACT_MATCH");
        assertThat(result.wine().name()).isEqualTo("Small Batch Malbec");
        verify(recognitionPort).recognize(any(), any(), any());
        verify(scanRecorder).record(eq(member), any(), eq(BARCODE));
    }

    @Test
    void aCrowdConfirmedWineThatIsGoneOrInactiveFallsBackToTheScan() {
        Wine inactive = Wine.create("Old Malbec", UUID.randomUUID(), WineType.RED, UUID.randomUUID());
        inactive.deactivate();
        when(barcodeConfirmations.findCrowdConfirmedWine(BARCODE, 2)).thenReturn(Optional.of(inactive.getId()));
        when(wineRepository.findById(inactive.getId())).thenReturn(Optional.of(inactive));
        when(recognitionPort.recognize(any(), any(), any())).thenReturn(label(List.of("UNKNOWN")));
        when(catalogMatcher.match(any(), any(), any())).thenReturn(noMatch());

        var result = handler.execute(barcodeCommand(UUID.randomUUID(), List.of()));

        assertThat(result.outcome().name()).isEqualTo("NO_MATCH");
        verify(recognitionPort).recognize(any(), any(), any());
    }

    @Test
    void aFailedBarcodeLookupFallsBackToTheScan() {
        when(barcodeConfirmations.findCrowdConfirmedWine(BARCODE, 2)).thenThrow(new IllegalStateException("db down"));
        when(recognitionPort.recognize(any(), any(), any())).thenReturn(label(List.of("NORTON")));
        when(catalogMatcher.match(any(), any(), any())).thenReturn(exactMatch());

        var result = handler.execute(barcodeCommand(UUID.randomUUID(), List.of()));

        assertThat(result.outcome().name()).isEqualTo("EXACT_MATCH");
        assertThat(result.wine().name()).isEqualTo("Small Batch Malbec");
    }

    @Test
    void aScanWithoutABarcodeNeverLooksUpConfirmations() {
        when(recognitionPort.recognize(any(), any(), any())).thenReturn(label(List.of("NORTON")));
        when(catalogMatcher.match(any(), any(), any())).thenReturn(exactMatch());

        handler.execute(command(List.of()));

        verifyNoInteractions(barcodeConfirmations, wineRepository);
    }

    @Test
    void returnsAnExactLocalOcrMatchWithoutCallingVisualRecognition() {
        ExtractedWineLabel localLabel = label(List.of("FORASTERO", "SMALL BATCH", "MALBEC"));
        WineLabelCatalogMatcher.MatchResult exactMatch = exactMatch();
        when(catalogMatcher.match(any(), any(), any())).thenReturn(exactMatch);

        var result = handler.execute(command(localLabel.observedText()));

        assertThat(result.outcome().name()).isEqualTo("EXACT_MATCH");
        assertThat(result.confidence()).isEqualTo(0.96);
        verify(recognitionPort, never()).recognize(any(), any(), any());
    }

    @Test
    void verifiesLocalOcrSuggestionsWithVisualRecognitionBeforeResponding() {
        ExtractedWineLabel visualLabel = label(List.of("BAD BROTHERS", "FACON"));
        when(catalogMatcher.match(any(), any(), any()))
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
        when(catalogMatcher.match(any(), any(), any()))
                .thenReturn(noMatch())
                .thenReturn(exactMatch());
        when(recognitionPort.recognize(any(), any(), any())).thenReturn(visualLabel);

        var result = handler.execute(command(List.of("FORASTERO", "SMALL BATCH")));

        assertThat(result.outcome().name()).isEqualTo("EXACT_MATCH");
        ArgumentCaptor<ExtractedWineLabel> labelCaptor =
                ArgumentCaptor.forClass(ExtractedWineLabel.class);
        verify(catalogMatcher, times(2))
                .match(labelCaptor.capture(), any(), any());
        assertThat(labelCaptor.getAllValues().get(1).observedText())
                .containsExactly("FORASTERO", "SMALL BATCH", "MALBEC");
        verify(recognitionPort).recognize(any(), any(), any());
    }

    @Test
    void usesVisualRecognitionDirectlyWhenTheClientHasNoOcrEvidence() {
        ExtractedWineLabel visualLabel = label(List.of("NORTON", "COSECHA TARDIA"));
        when(recognitionPort.recognize(any(), any(), any())).thenReturn(visualLabel);
        when(catalogMatcher.match(any(), any(), any())).thenReturn(exactMatch());

        var result = handler.execute(command(List.of()));

        assertThat(result.outcome().name()).isEqualTo("EXACT_MATCH");
        verify(catalogMatcher).match(eq(visualLabel), any(), any());
        verify(recognitionPort).recognize(any(), any(), any());
    }

    @Test
    void returnsPossibleMatchesWithoutPromotingAnAmbiguousCandidateToExact() {
        ExtractedWineLabel visualLabel = label(List.of("BAD BROTHERS", "FACON"));
        when(recognitionPort.recognize(any(), any(), any())).thenReturn(visualLabel);
        when(catalogMatcher.match(any(), any(), any())).thenReturn(possibleMatch(0.83));

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
        when(catalogMatcher.match(any(), any(), any())).thenReturn(possibleMatch(1.0));

        var result = handler.execute(command(List.of()));

        assertThat(result.outcome().name()).isEqualTo("POSSIBLE_MATCHES");
        assertThat(result.confidence()).isEqualTo(0.89);
        assertThat(result.candidates().getFirst().score()).isEqualTo(0.89);
    }

    @Test
    void returnsNoMatchWhenNeitherTextNorVisualEvidenceFindsCandidates() {
        ExtractedWineLabel visualLabel = label(List.of("UNKNOWN LABEL"));
        when(catalogMatcher.match(any(), any(), any())).thenReturn(noMatch());
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
        when(catalogMatcher.match(any(), any(), any())).thenReturn(noMatch());
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

    @Test
    void visualCandidatesFoundBesideRecognitionReachTheMatcherAndTheVerifier() {
        var visualIndexMock = mock(WineVisualIndexService.class);
        var verifierMock = mock(WineLabelCandidateVerifier.class);
        var hints = List.of(new WineVisualIndexPort.VisualMatch(UUID.randomUUID(), 0.9));
        CompletableFuture<List<WineVisualIndexPort.VisualMatch>> search = CompletableFuture.completedFuture(hints);
        when(visualIndexMock.startSearch(any(), eq("image/jpeg"), eq(10))).thenReturn(search);
        when(visualIndexMock.await(eq(search), any())).thenReturn(hints);
        var suggestions = possibleMatch(0.8);
        when(catalogMatcher.match(any(), any(), eq(hints))).thenReturn(suggestions);
        when(verifierMock.verify(any(), eq("image/jpeg"), any(), eq(suggestions), any())).thenReturn(exactMatch());
        when(recognitionPort.recognize(any(), any(), any())).thenReturn(label(List.of("NORTON")));
        var useCase = new ScanWineLabelCommandHandler(recognitionPort, catalogMatcher, metricsPort,
                new WineLabelScanPolicy(), scanRecorder, visualIndexMock, verifierMock,
                barcodeConfirmations, wineRepository, wineryQuery);

        var result = useCase.execute(command(List.of()));

        assertThat(result.outcome().name()).isEqualTo("EXACT_MATCH");
        assertThat(result.wine().name()).isEqualTo("Small Batch Malbec");
    }

    @Test
    void visualCandidatesAreSuggestedWhenTheTextFindsNothing() {
        var lookalike = new WineLabelCandidate(
                Wine.create("Gran Cuvee", UUID.randomUUID(), WineType.RED, UUID.randomUUID()), "Bodega Norte");
        when(recognitionPort.recognize(any(), any(), any())).thenReturn(label(List.of("illegible")));
        when(catalogMatcher.match(any(), any(), any())).thenReturn(new WineLabelCatalogMatcher.MatchResult(
                List.of(), Map.of(), false, List.of(new WineLabelCatalogMatcher.VisualCandidate(lookalike, 0.97))));

        var result = handler.execute(command(List.of()));

        assertThat(result.outcome().name()).isEqualTo("POSSIBLE_MATCHES");
        assertThat(result.suggestions()).extracting(WineSummaryResponse::name).containsExactly("Gran Cuvee");
        assertThat(result.candidates().getFirst().score()).isEqualTo(0.89);
    }

    @Test
    void aFailedRecognitionCancelsTheVisualSearch() {
        var visualIndexMock = mock(WineVisualIndexService.class);
        CompletableFuture<List<WineVisualIndexPort.VisualMatch>> search = new CompletableFuture<>();
        when(visualIndexMock.startSearch(any(), any(), anyInt())).thenReturn(search);
        when(recognitionPort.recognize(any(), any(), any())).thenThrow(
                new ExternalServiceUnavailableException("LABEL_RECOGNITION_UNAVAILABLE", "down", null));
        var useCase = new ScanWineLabelCommandHandler(recognitionPort, catalogMatcher, metricsPort,
                new WineLabelScanPolicy(), scanRecorder, visualIndexMock, verifier,
                barcodeConfirmations, wineRepository, wineryQuery);

        assertThatThrownBy(() -> useCase.execute(command(List.of())))
                .isInstanceOf(ExternalServiceUnavailableException.class);
        assertThat(search).isCancelled();
        verify(catalogMatcher, never()).match(any(), any(), any());
    }

    private ScanWineLabelCommand barcodeCommand(UUID member, List<String> observedText) {
        return new ScanWineLabelCommand(new byte[] {1, 2, 3}, "image/jpeg", observedText, member, BARCODE);
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
