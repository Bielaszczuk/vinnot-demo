package com.vinnot.wine.application.service;

import com.vinnot.wine.application.port.out.CatalogImageSourcePort;
import com.vinnot.wine.application.port.out.WineImageEmbeddingPort;
import com.vinnot.wine.application.port.out.WineImageEmbeddingRepositoryPort;
import com.vinnot.wine.application.port.out.WineVisualIndexPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CancellationException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Visual retrieval of catalog wines from a label photo, as label-recognition apps do: every catalog label image
 * Vinnot hosts is embedded once, kept in memory, and a scanned photo is compared with all of them. The scan never
 * depends on it: without a provider, an index or a response, it simply returns no visual candidates.
 */
@Service
public class WineVisualIndexService {

    private static final Logger LOGGER = LoggerFactory.getLogger(WineVisualIndexService.class);
    private static final int EMBEDDING_BATCH = 25;
    /** Bean name of the bounded executor that runs a scan's visual search beside label recognition. */
    public static final String SEARCH_EXECUTOR = "wineVisualSearchExecutor";

    private final WineImageEmbeddingPort embeddings;
    private final WineImageEmbeddingRepositoryPort repository;
    private final CatalogImageSourcePort images;
    private final WineVisualIndexPort index;
    private final Executor searchExecutor;
    private final double minSimilarity;
    private final AtomicBoolean loaded = new AtomicBoolean();
    private UUID backfillCursor;

    public WineVisualIndexService(WineImageEmbeddingPort embeddings, WineImageEmbeddingRepositoryPort repository,
            CatalogImageSourcePort images, WineVisualIndexPort index,
            @Qualifier(SEARCH_EXECUTOR) Executor searchExecutor,
            @Value("${app.wine-label.visual-index.min-similarity:0.6}") double minSimilarity) {
        if (minSimilarity < -1.0 || minSimilarity > 1.0) {
            throw new IllegalArgumentException("app.wine-label.visual-index.min-similarity must be in [-1, 1]");
        }
        this.embeddings = embeddings;
        this.repository = repository;
        this.images = images;
        this.index = index;
        this.searchExecutor = searchExecutor;
        this.minSimilarity = minSimilarity;
    }

    public boolean isReady() {
        return embeddings.isAvailable() && loaded.get() && index.size() > 0;
    }

    /** Loads the stored vectors of the current model into memory; later calls do nothing. */
    public int load() {
        if (!embeddings.isAvailable() || loaded.get()) {
            return 0;
        }
        int[] count = {0};
        repository.forEachVector(embeddings.modelId(), embeddings.dimensions(), (wineId, vector) -> {
            index.put(wineId, vector);
            count[0]++;
        });
        loaded.set(true);
        LOGGER.info("Loaded {} label image vector(s) into the visual index", count[0]);
        return count[0];
    }

    /**
     * Embeds up to {@code limit} catalog images that have no current vector. It walks the catalog in wine order
     * and starts over once it reaches the end, so a failing image never blocks the rest.
     *
     * @return the number of images embedded
     */
    public synchronized int backfill(int limit) {
        if (!embeddings.isAvailable()) {
            return 0;
        }
        load();
        List<WineImageEmbeddingRepositoryPort.PendingImage> pending = repository.findPending(
                embeddings.modelId(), embeddings.dimensions(), backfillCursor, limit);
        if (pending.isEmpty()) {
            backfillCursor = null;
            return 0;
        }
        backfillCursor = pending.getLast().wineId();
        int embedded = 0;
        for (int start = 0; start < pending.size(); start += EMBEDDING_BATCH) {
            embedded += embedBatch(pending.subList(start, Math.min(pending.size(), start + EMBEDDING_BATCH)));
        }
        return embedded;
    }

    private int embedBatch(List<WineImageEmbeddingRepositoryPort.PendingImage> batch) {
        List<WineImageEmbeddingRepositoryPort.PendingImage> readable = new ArrayList<>();
        List<WineImageEmbeddingPort.LabelImage> labels = new ArrayList<>();
        for (var image : batch) {
            images.load(image.imageUrl()).ifPresent(label -> {
                readable.add(image);
                labels.add(label);
            });
        }
        if (labels.isEmpty()) {
            return 0;
        }
        List<float[]> vectors = embeddings.embed(labels);
        for (int i = 0; i < readable.size(); i++) {
            var image = readable.get(i);
            repository.save(image.wineId(), image.imageUrl(), embeddings.modelId(), vectors.get(i));
            index.put(image.wineId(), vectors.get(i));
        }
        return readable.size();
    }

    /**
     * The catalog wines whose label looks most like the photo, most similar first, keeping only those at least as
     * similar as {@code app.wine-label.visual-index.min-similarity}.
     */
    public List<WineVisualIndexPort.VisualMatch> search(byte[] photo, String contentType, int limit) {
        if (!isReady() || Objects.isNull(photo) || photo.length == 0) {
            return List.of();
        }
        Optional<float[]> query = embedQuery(photo, contentType);
        return query.map(vector -> index.nearest(vector, limit)).orElse(List.of()).stream()
                .filter(match -> match.similarity() >= minSimilarity).toList();
    }

    /** Starts {@link #search} in the background; a full executor or a not-ready index gives no candidates. */
    public CompletableFuture<List<WineVisualIndexPort.VisualMatch>> startSearch(
            byte[] photo, String contentType, int limit) {
        if (!isReady()) {
            return CompletableFuture.completedFuture(List.of());
        }
        try {
            return CompletableFuture.supplyAsync(() -> search(photo, contentType, limit), searchExecutor);
        } catch (RejectedExecutionException busy) {
            LOGGER.debug("Visual label search skipped: executor is busy");
            return CompletableFuture.completedFuture(List.of());
        }
    }

    /** The result of {@link #startSearch}, or no candidates if it is not ready within {@code wait}. */
    public List<WineVisualIndexPort.VisualMatch> await(
            CompletableFuture<List<WineVisualIndexPort.VisualMatch>> search, Duration wait) {
        try {
            return search.get(Math.max(0, wait.toMillis()), TimeUnit.MILLISECONDS);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            search.cancel(true);
            return List.of();
        } catch (ExecutionException | TimeoutException | CancellationException unavailable) {
            search.cancel(true);
            return List.of();
        }
    }

    private Optional<float[]> embedQuery(byte[] photo, String contentType) {
        try {
            return Optional.of(embeddings.embed(List.of(
                    new WineImageEmbeddingPort.LabelImage(photo, contentType))).getFirst());
        } catch (RuntimeException exception) {
            LOGGER.warn("Visual label search unavailable: {}", exception.getClass().getSimpleName());
            return Optional.empty();
        }
    }
}
