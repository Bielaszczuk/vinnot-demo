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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.time.Duration;
import java.util.function.Supplier;

@Service
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
    /** Runs a scan's local lookup and recognition so they can overlap. */
    public static final String SCAN_EXECUTOR = "wineLabelScanExecutor";
    /**
     * A local lookup that answers the scan usually does so quickly; past this wait, recognition starts beside it
     * instead of after it, so a lookup that cannot answer no longer delays the scan.
     */
    private static final Duration RECOGNITION_HEDGE = Duration.ofMillis(400);
    private static final Set<String> RECOVERABLE_LOCAL_FAILURES = Set.of("LABEL_CATALOG_UNAVAILABLE", "LABEL_SCAN_TIMEOUT");

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
    private final Executor scanExecutor;
    private final Duration scanBudget;

    @Autowired
    public ScanWineLabelCommandHandler(WineLabelRecognitionPort recognitionPort,
                                       WineLabelCatalogMatcher catalogMatcher,
                                       WineLabelMetricsPort metricsPort,
                                       WineLabelScanPolicy scanPolicy,
                                       WineLabelScanRecorder scanRecorder,
                                       WineVisualIndexService visualIndex,
                                       WineLabelCandidateVerifier candidateVerifier,
                                       WineBarcodeConfirmationPort barcodeConfirmations,
                                       WineRepositoryPort wineRepository,
                                       WineryQueryPort wineryQueryPort,
                                       @Qualifier(SCAN_EXECUTOR) Executor scanExecutor) {
        this(recognitionPort, catalogMatcher, metricsPort, scanPolicy, scanRecorder, visualIndex, candidateVerifier,
                barcodeConfirmations, wineRepository, wineryQueryPort, scanExecutor, WineLabelScanDeadline.DEFAULT_BUDGET);
    }

    ScanWineLabelCommandHandler(WineLabelRecognitionPort recognitionPort,
                                WineLabelCatalogMatcher catalogMatcher,
                                WineLabelMetricsPort metricsPort,
                                WineLabelScanPolicy scanPolicy,
                                WineLabelScanRecorder scanRecorder,
                                WineVisualIndexService visualIndex,
                                WineLabelCandidateVerifier candidateVerifier,
                                WineBarcodeConfirmationPort barcodeConfirmations,
                                WineRepositoryPort wineRepository,
                                WineryQueryPort wineryQueryPort,
                                Executor scanExecutor,
                                Duration scanBudget) {
        this.recognitionPort = recognitionPort;
        this.catalogMatcher = catalogMatcher;
        this.metricsPort = metricsPort;
        this.scanPolicy = scanPolicy;
        this.scanRecorder = scanRecorder;
        this.visualIndex = visualIndex;
        this.candidateVerifier = candidateVerifier;
        this.barcodeConfirmations = barcodeConfirmations;
        this.wineRepository = wineRepository;
        this.wineryQueryPort = wineryQueryPort;
        this.scanExecutor = scanExecutor;
        this.scanBudget = scanBudget;
    }

    @Override
    public WineLabelScanResponse execute(ScanWineLabelCommand command) {
        ScanTrace trace = new ScanTrace();
        try {
            WineLabelScanResponse response = scan(command, trace);
            trace.log(response.outcome().name());
            return response;
        } catch (RuntimeException failure) {
            trace.log("FAILED_" + failureName(failure));
            throw failure;
        }
    }

    private WineLabelScanResponse scan(ScanWineLabelCommand command, ScanTrace trace) {
        long startedAt = trace.startedAt;
        WineLabelScanDeadline deadline = new WineLabelScanDeadline(scanBudget);
        Optional<WineLabelScanResponse> barcodeMatch = crowdConfirmedBarcodeMatch(command);
        if (barcodeMatch.isPresent()) {
            recordMetrics(barcodeMatch.get(), startedAt, false);
            return rememberBarcodeAnswer(command, barcodeMatch.get());
        }
        ExtractedWineLabel observedLabel = null;
        CompletableFuture<WineLabelCatalogMatcher.MatchResult> localSearch = null;
        if (!command.observedText().isEmpty()) {
            ExtractedWineLabel localLabel = fromObservedText(command.observedText());
            observedLabel = localLabel;
            localSearch = CompletableFuture.supplyAsync(() -> measureStage(
                    WineLabelMetricsPort.ScanStage.LOCAL_CATALOG, trace,
                    () -> catalogMatcher.match(localLabel, deadline.limitedTo(LOCAL_CATALOG_BUDGET), List.of())),
                    scanExecutor);
            Optional<WineLabelCatalogMatcher.MatchResult> localMatch =
                    completableLocalMatch(localSearch, RECOGNITION_HEDGE, deadline);
            if (localMatch.isPresent()) {
                return localResponse(command, observedLabel, localMatch.get(), startedAt);
            }
        }

        // A local lookup that is still running keeps racing recognition; image retrieval against our own catalog
        // runs beside both, so neither adds latency to the other.
        CompletableFuture<List<WineVisualIndexPort.VisualMatch>> visualSearch =
                visualIndex.startSearch(command.imageBytes(), command.contentType(), VISUAL_CANDIDATES);
        CompletableFuture<ExtractedWineLabel> recognition = CompletableFuture.supplyAsync(() -> measureStage(
                WineLabelMetricsPort.ScanStage.VISUAL_RECOGNITION, trace,
                () -> recognitionPort.recognize(command.imageBytes(), command.contentType(), deadline.remaining())),
                scanExecutor);
        ExtractedWineLabel label;
        try {
            if (Objects.nonNull(localSearch) && !localSearch.isDone()) {
                awaitFirst(localSearch, recognition, deadline);
                if (recognition.isCompletedExceptionally()) {
                    // A provider that refuses at once (paused paid calls, exhausted budget) must not fail a scan
                    // the local lookup can still answer: its own budget bounds this wait.
                    awaitFirst(localSearch, localSearch, deadline);
                }
                Optional<WineLabelCatalogMatcher.MatchResult> localMatch = localSearch.isDone()
                        ? completableLocalMatch(localSearch, Duration.ZERO, deadline)
                        : Optional.empty();
                if (localMatch.isPresent()) {
                    recognition.cancel(true);
                    visualSearch.cancel(true);
                    return localResponse(command, observedLabel, localMatch.get(), startedAt);
                }
            }
            label = join(recognition);
        } catch (RuntimeException failure) {
            recognition.cancel(true);
            visualSearch.cancel(true);
            throw failure;
        }
        label = mergeObservedText(label, command.observedText());
        ExtractedWineLabel enrichedLabel = label;
        List<WineVisualIndexPort.VisualMatch> visualHints = measureStage(
                WineLabelMetricsPort.ScanStage.VISUAL_WAIT, trace,
                () -> visualIndex.await(visualSearch, VISUAL_SEARCH_WAIT));
        WineLabelCatalogMatcher.MatchResult catalogMatch = measureStage(
                WineLabelMetricsPort.ScanStage.ENRICHED_CATALOG, trace,
                () -> catalogMatcher.match(enrichedLabel, deadline, visualHints));
        WineLabelCatalogMatcher.MatchResult match = measureStage(
                WineLabelMetricsPort.ScanStage.CANDIDATE_VERIFICATION, trace,
                () -> candidateVerifier.verify(
                        command.imageBytes(), command.contentType(), enrichedLabel, catalogMatch, deadline));
        deadline.remaining();
        WineLabelScanResponse response = toResponse(label, match);
        recordMetrics(response, startedAt, true);
        return remember(command, response);
    }

    private WineLabelScanResponse localResponse(ScanWineLabelCommand command, ExtractedWineLabel observedLabel,
                                                WineLabelCatalogMatcher.MatchResult localMatch, long startedAt) {
        WineLabelScanResponse response = toResponse(observedLabel, localMatch);
        recordMetrics(response, startedAt, false);
        return remember(command, response);
    }

    /**
     * The local match when the lookup finished within {@code wait} and it can answer the scan alone. A lookup still
     * running, a match too weak to answer, or an exhausted broad lookup gives nothing; noisy native OCR can exhaust a
     * broad lookup, and visual extraction may recover with a precise identity. Any other failure is the scan's.
     */
    private Optional<WineLabelCatalogMatcher.MatchResult> completableLocalMatch(
            CompletableFuture<WineLabelCatalogMatcher.MatchResult> localSearch, Duration wait,
            WineLabelScanDeadline deadline) {
        try {
            WineLabelCatalogMatcher.MatchResult match = localSearch.get(wait.toMillis(), TimeUnit.MILLISECONDS);
            return scanPolicy.canCompleteWithoutVisualFallback(match) ? Optional.of(match) : Optional.empty();
        } catch (TimeoutException running) {
            return Optional.empty();
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw scanTimeout();
        } catch (ExecutionException failed) {
            RuntimeException failure = unwrap(failed);
            if (failure instanceof ExternalServiceUnavailableException unavailable
                    && RECOVERABLE_LOCAL_FAILURES.contains(unavailable.getCode())) {
                deadline.remaining();
                return Optional.empty();
            }
            throw failure;
        }
    }

    /** Waits until either lookup finishes, within the scan budget. */
    private static void awaitFirst(CompletableFuture<?> first, CompletableFuture<?> second,
                                   WineLabelScanDeadline deadline) {
        try {
            CompletableFuture.anyOf(first, second).get(deadline.remaining().toNanos(), TimeUnit.NANOSECONDS);
        } catch (ExecutionException finishedWithFailure) {
            // The failed lookup is read, and its failure handled, by the caller.
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw scanTimeout();
        } catch (TimeoutException exhausted) {
            throw scanTimeout();
        }
    }

    /** The same failure the scan deadline raises once its budget is spent or the scan is interrupted. */
    private static ExternalServiceUnavailableException scanTimeout() {
        return new ExternalServiceUnavailableException(
                "LABEL_SCAN_TIMEOUT", "Wine-label scan exceeded its time budget", null);
    }

    private static <T> T join(CompletableFuture<T> future) {
        try {
            return future.join();
        } catch (CompletionException failed) {
            throw unwrap(failed);
        }
    }

    private static RuntimeException unwrap(Throwable wrapped) {
        Throwable cause = Objects.requireNonNullElse(wrapped.getCause(), wrapped);
        if (cause instanceof Error error) {
            throw error;
        }
        return cause instanceof RuntimeException runtime ? runtime : new IllegalStateException(cause);
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
            WineLabelMetricsPort.ScanStage stage, ScanTrace trace, Supplier<T> operation) {
        long startedAt = System.nanoTime();
        try {
            T result = operation.get();
            metricsPort.recordScanStage(stage, trace.add(stage, startedAt), true);
            return result;
        } catch (RuntimeException exception) {
            metricsPort.recordScanStage(stage, trace.add(stage, startedAt), false);
            throw exception;
        }
    }

    private static String failureName(RuntimeException failure) {
        return failure instanceof ExternalServiceUnavailableException unavailable
                ? unavailable.getCode()
                : failure.getClass().getSimpleName();
    }

    /** The time of each stage one scan ran, logged as a single line so slow scans can be explained. */
    private static final class ScanTrace {
        private final long startedAt = System.nanoTime();
        private final Map<WineLabelMetricsPort.ScanStage, Long> stageMillis =
                new EnumMap<>(WineLabelMetricsPort.ScanStage.class);

        synchronized Duration add(WineLabelMetricsPort.ScanStage stage, long stageStartedAt) {
            Duration elapsed = Duration.ofNanos(System.nanoTime() - stageStartedAt);
            stageMillis.merge(stage, elapsed.toMillis(), Long::sum);
            return elapsed;
        }

        synchronized void log(String outcome) {
            StringBuilder line = new StringBuilder("totalMs=")
                    .append(Duration.ofNanos(System.nanoTime() - startedAt).toMillis());
            stageMillis.forEach((stage, millis) -> line.append(' ').append(stage).append('=').append(millis));
            LOG.info("Label scan finished: outcome={} {}", outcome, line);
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
