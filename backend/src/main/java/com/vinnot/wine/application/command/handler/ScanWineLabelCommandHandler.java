package com.vinnot.wine.application.command.handler;

import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.wine.application.command.model.ScanWineLabelCommand;
import com.vinnot.wine.application.port.in.ScanWineLabelUseCase;
import com.vinnot.wine.application.port.out.WineBarcodeConfirmationPort;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.port.out.WineLabelRecognitionPort;
import com.vinnot.wine.application.port.out.WineryQueryPort;
import com.vinnot.wine.application.port.out.WineLabelMetricsPort;
import com.vinnot.wine.application.port.out.WineVisualIndexPort;
import com.vinnot.wine.application.query.response.ExtractedWineLabelResponse;
import com.vinnot.wine.application.query.response.WineLabelMatchResponse;
import com.vinnot.wine.application.query.response.WineLabelScanResponse;
import com.vinnot.wine.application.query.response.WineSummaryResponse;
import com.vinnot.wine.domain.model.ExtractedWineLabel;
import com.vinnot.wine.domain.model.RankedWineLabelCandidate;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.service.WineLabelIdentityNormalizer;
import com.vinnot.wine.application.service.WineLabelCatalogMatcher;
import com.vinnot.wine.application.service.WineLabelScanPolicy;
import com.vinnot.wine.application.service.WineLabelScanDeadline;
import com.vinnot.wine.application.service.WineLabelScanRecorder;
import com.vinnot.wine.application.service.WineLabelCandidateVerifier;
import com.vinnot.wine.application.service.WineVisualIndexService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.time.Duration;
import java.util.function.Supplier;

@Service
@RequiredArgsConstructor
public class ScanWineLabelCommandHandler implements ScanWineLabelUseCase {

    private static final Logger LOG = LoggerFactory.getLogger(ScanWineLabelCommandHandler.class);
    private static final int SUGGESTION_LIMIT = 3;
    private static final Duration LOCAL_CATALOG_BUDGET = Duration.ofSeconds(3);
    private static final int VISUAL_CANDIDATES = 10;
    /** The visual search started with recognition, which takes seconds; this only covers a slow embedding call. */
    private static final Duration VISUAL_SEARCH_WAIT = Duration.ofMillis(1500);
    /** A barcode is trusted once this many members confirmed the same wine, more than for any other wine. */
    private static final int BARCODE_MINIMUM_MEMBERS = 2;
    private static final double BARCODE_MATCH_CONFIDENCE = 1.0;

    private final WineLabelRecognitionPort recognitionPort;
    private final WineLabelCatalogMatcher catalogMatcher;
    private final WineLabelMetricsPort metricsPort;
    private final WineLabelScanPolicy scanPolicy;
    private final WineLabelScanRecorder scanRecorder;
    private final WineVisualIndexService visualIndex;
    private final WineLabelCandidateVerifier candidateVerifier;
    private final WineBarcodeConfirmationPort barcodeConfirmations;
    private final WineRepositoryPort wineRepository;
    private final WineryQueryPort wineryQueryPort;

    @Override
    public WineLabelScanResponse execute(ScanWineLabelCommand command) {
        long startedAt = System.nanoTime();
        WineLabelScanDeadline deadline = new WineLabelScanDeadline(WineLabelScanDeadline.DEFAULT_BUDGET);
        Optional<WineLabelScanResponse> barcodeMatch = crowdConfirmedBarcodeMatch(command);
        if (barcodeMatch.isPresent()) {
            recordMetrics(barcodeMatch.get(), startedAt, false);
            return rememberBarcodeAnswer(command, barcodeMatch.get());
        }
        if (!command.observedText().isEmpty()) {
            ExtractedWineLabel observedLabel = fromObservedText(command.observedText());
            try {
                WineLabelCatalogMatcher.MatchResult localMatch =
                        measureStage(WineLabelMetricsPort.ScanStage.LOCAL_CATALOG,
                                () -> catalogMatcher.match(observedLabel, deadline.limitedTo(LOCAL_CATALOG_BUDGET), List.of()));
                if (scanPolicy.canCompleteWithoutVisualFallback(localMatch)) {
                    WineLabelScanResponse response = toResponse(observedLabel, localMatch);
                    recordMetrics(response, startedAt, false);
                    return remember(command, response);
                }
            } catch (ExternalServiceUnavailableException exception) {
                if (!"LABEL_CATALOG_UNAVAILABLE".equals(exception.getCode())
                        && !"LABEL_SCAN_TIMEOUT".equals(exception.getCode())) {
                    throw exception;
                }
                // Noisy native OCR can exhaust a broad lookup. Visual extraction
                // may recover with a precise identity; the enriched lookup must still succeed.
                deadline.remaining();
            }
        }

        // Image retrieval against our own catalog runs beside recognition, so it adds no latency.
        CompletableFuture<List<WineVisualIndexPort.VisualMatch>> visualSearch =
                visualIndex.startSearch(command.imageBytes(), command.contentType(), VISUAL_CANDIDATES);
        ExtractedWineLabel label;
        try {
            label = measureStage(
                    WineLabelMetricsPort.ScanStage.VISUAL_RECOGNITION,
                    () -> recognitionPort.recognize(
                            command.imageBytes(), command.contentType(), deadline.remaining()));
        } catch (RuntimeException failure) {
            visualSearch.cancel(true);
            throw failure;
        }
        label = mergeObservedText(label, command.observedText());
        ExtractedWineLabel enrichedLabel = label;
        List<WineVisualIndexPort.VisualMatch> visualHints = visualIndex.await(visualSearch, VISUAL_SEARCH_WAIT);
        WineLabelCatalogMatcher.MatchResult catalogMatch = measureStage(
                WineLabelMetricsPort.ScanStage.ENRICHED_CATALOG,
                () -> catalogMatcher.match(enrichedLabel, deadline, visualHints));
        WineLabelCatalogMatcher.MatchResult match = candidateVerifier.verify(
                command.imageBytes(), command.contentType(), enrichedLabel, catalogMatch, deadline);
        deadline.remaining();
        WineLabelScanResponse response = toResponse(label, match);
        recordMetrics(response, startedAt, true);
        return remember(command, response);
    }

    /**
     * Records the scan of a signed-in member (and its point for an exact match). A failure to record never takes the
     * result away from the member: it is logged and the scan is answered anyway.
     */
    private WineLabelScanResponse remember(ScanWineLabelCommand command, WineLabelScanResponse response) {
        if (Objects.nonNull(command.userId())) {
            try {
                return response.withScanId(scanRecorder.record(command.userId(), response, command.barcode()));
            } catch (RuntimeException failure) {
                LOG.warn("Could not record the label scan of user {}: {}", command.userId(), failure.getClass().getSimpleName());
            }
        }
        return response;
    }

    private WineLabelScanResponse rememberBarcodeAnswer(ScanWineLabelCommand command, WineLabelScanResponse response) {
        if (Objects.nonNull(command.userId())) {
            try {
                return response.withScanId(scanRecorder.recordBarcodeAnswer(command.userId(), response));
            } catch (RuntimeException failure) {
                LOG.warn("Could not record the label scan of user {}: {}", command.userId(), failure.getClass().getSimpleName());
            }
        }
        return response;
    }

    /**
     * A barcode that enough members confirmed for one active wine (#544) is answered as an exact match before any AI
     * call; otherwise, or when the lookup fails, the scan goes on as usual.
     */
    private Optional<WineLabelScanResponse> crowdConfirmedBarcodeMatch(ScanWineLabelCommand command) {
        if (Objects.isNull(command.barcode())) {
            return Optional.empty();
        }
        try {
            return barcodeConfirmations.findCrowdConfirmedWine(command.barcode(), BARCODE_MINIMUM_MEMBERS)
                    .flatMap(wineRepository::findById)
                    .filter(Wine::isActive)
                    .map(wine -> toBarcodeMatch(wine, command.observedText()));
        } catch (RuntimeException failure) {
            LOG.warn("Could not look up the confirmed barcode of a label scan: {}", failure.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    private WineLabelScanResponse toBarcodeMatch(Wine wine, List<String> observedText) {
        WineryQueryPort.WineryData winery = Objects.nonNull(wine.getWineryId())
                ? wineryQueryPort.findById(wine.getWineryId()).orElse(null) : null;
        WineSummaryResponse summary = toSummary(wine, winery);
        return new WineLabelScanResponse(
                WineLabelScanResponse.Outcome.EXACT_MATCH,
                BARCODE_MATCH_CONFIDENCE,
                summary,
                List.of(),
                List.of(new WineLabelMatchResponse(summary, BARCODE_MATCH_CONFIDENCE)),
                ExtractedWineLabelResponse.fromDomain(fromObservedText(observedText)));
    }

    private void recordMetrics(
            WineLabelScanResponse response, long startedAt, boolean visualFallback) {
        metricsPort.recordScan(response.outcome(),
                Duration.ofNanos(System.nanoTime() - startedAt), visualFallback);
    }

    private <T> T measureStage(
            WineLabelMetricsPort.ScanStage stage, Supplier<T> operation) {
        long startedAt = System.nanoTime();
        try {
            T result = operation.get();
            metricsPort.recordScanStage(
                    stage, Duration.ofNanos(System.nanoTime() - startedAt), true);
            return result;
        } catch (RuntimeException exception) {
            metricsPort.recordScanStage(
                    stage, Duration.ofNanos(System.nanoTime() - startedAt), false);
            throw exception;
        }
    }

    private WineLabelScanResponse toResponse(
            ExtractedWineLabel label,
            WineLabelCatalogMatcher.MatchResult match) {
        List<RankedWineLabelCandidate> ranked = match.ranked();
        Map<UUID, WineryQueryPort.WineryData> wineries = match.wineries();

        if (match.exact()) {
            WineSummaryResponse exact = toSummary(ranked.getFirst(), wineries);
            return new WineLabelScanResponse(
                    WineLabelScanResponse.Outcome.EXACT_MATCH,
                    ranked.getFirst().score(),
                    exact,
                    List.of(),
                    List.of(toMatchResponse(ranked.getFirst(), wineries)),
                    ExtractedWineLabelResponse.fromDomain(label));
        }

        List<RankedWineLabelCandidate> suggestions = ranked.isEmpty()
                ? match.visual().stream().limit(SUGGESTION_LIMIT)
                        .map(visual -> new RankedWineLabelCandidate(visual.candidate(), visual.similarity()))
                        .toList()
                : ranked.stream().limit(SUGGESTION_LIMIT).toList();
        List<WineSummaryResponse> summaries = suggestions.stream()
                .map(candidate -> toSummary(candidate, wineries))
                .toList();
        return new WineLabelScanResponse(
                summaries.isEmpty()
                        ? WineLabelScanResponse.Outcome.NO_MATCH
                        : WineLabelScanResponse.Outcome.POSSIBLE_MATCHES,
                suggestions.isEmpty() ? 0.0 : scanPolicy.suggestionConfidence(
                        suggestions.getFirst().score()),
                null,
                summaries,
                suggestions.stream()
                        .map(candidate -> toSuggestionResponse(candidate, wineries))
                        .toList(),
                ExtractedWineLabelResponse.fromDomain(label));
    }

    private ExtractedWineLabel fromObservedText(List<String> observedText) {
        List<Integer> vintages = observedText.stream().map(String::trim)
                .filter(WineLabelIdentityNormalizer::isPlausibleVintage)
                .map(Integer::valueOf).distinct().toList();
        return new ExtractedWineLabel(
                null,
                null,
                null,
                vintages.size() == 1 ? vintages.getFirst() : null,
                null,
                null,
                null,
                null,
                1.0,
                null,
                null,
                true,
                observedText);
    }

    private ExtractedWineLabel mergeObservedText(
            ExtractedWineLabel label, List<String> locallyObservedText) {
        if (locallyObservedText.isEmpty()) {
            return label;
        }
        Map<String, String> merged = new LinkedHashMap<>();
        locallyObservedText.forEach(line -> addObservedLine(merged, line));
        label.observedText().forEach(line -> addObservedLine(merged, line));
        return new ExtractedWineLabel(
                label.wineryName(),
                label.wineName(),
                label.grapeVariety(),
                label.vintage(),
                label.wineType(),
                label.region(),
                label.country(),
                label.alcoholContent(),
                label.extractionConfidence(),
                label.searchKeywords(),
                label.visualDescription(),
                label.wineLabel(),
                List.copyOf(merged.values()),
                label.identitySymbols());
    }

    private void addObservedLine(Map<String, String> destination, String line) {
        if (Objects.nonNull(line) && !line.isBlank()) {
            destination.putIfAbsent(line.toLowerCase(Locale.ROOT), line);
        }
    }

    private WineLabelMatchResponse toMatchResponse(
            RankedWineLabelCandidate candidate,
            Map<UUID, WineryQueryPort.WineryData> wineries) {
        return new WineLabelMatchResponse(
                toSummary(candidate, wineries), candidate.score());
    }

    private WineLabelMatchResponse toSuggestionResponse(
            RankedWineLabelCandidate candidate,
            Map<UUID, WineryQueryPort.WineryData> wineries) {
        return new WineLabelMatchResponse(
                toSummary(candidate, wineries),
                scanPolicy.suggestionConfidence(candidate.score()));
    }

    private WineSummaryResponse toSummary(
            RankedWineLabelCandidate candidate,
            Map<UUID, WineryQueryPort.WineryData> wineries) {
        Wine wine = candidate.candidate().wine();
        return toSummary(wine, Objects.nonNull(wine.getWineryId()) ? wineries.get(wine.getWineryId()) : null);
    }

    private WineSummaryResponse toSummary(Wine wine, WineryQueryPort.WineryData winery) {
        return WineSummaryResponse.fromDomain(
                wine,
                Objects.nonNull(winery) ? winery.name() : null,
                Objects.nonNull(winery) ? winery.regionName() : null,
                Objects.nonNull(winery) ? winery.countryName() : null);
    }
}
