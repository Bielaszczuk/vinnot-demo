package com.vinnot.wine.application.service;

import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.wine.application.port.out.CatalogImageSourcePort;
import com.vinnot.wine.application.port.out.WineImageEmbeddingPort;
import com.vinnot.wine.application.port.out.WineImageEmbeddingRepositoryPort;
import com.vinnot.wine.application.port.out.WineImageEmbeddingRepositoryPort.PendingImage;
import com.vinnot.wine.application.port.out.WineVisualIndexPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.RejectedExecutionException;
import java.util.function.BiConsumer;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WineVisualIndexServiceTest {

    private static final String MODEL = "gemini-embedding-2";
    private final WineImageEmbeddingPort embeddings = mock(WineImageEmbeddingPort.class);
    private final WineImageEmbeddingRepositoryPort repository = mock(WineImageEmbeddingRepositoryPort.class);
    private final CatalogImageSourcePort images = mock(CatalogImageSourcePort.class);
    private final WineVisualIndexPort index = mock(WineVisualIndexPort.class);
    private final WineVisualIndexService service = new WineVisualIndexService(
            embeddings, repository, images, index, Runnable::run, 0.6);
    private final WineImageEmbeddingPort.LabelImage label =
            new WineImageEmbeddingPort.LabelImage(new byte[] {1}, "image/webp");

    @BeforeEach
    void provider() {
        when(embeddings.isAvailable()).thenReturn(true);
        when(embeddings.modelId()).thenReturn(MODEL);
        when(embeddings.dimensions()).thenReturn(2);
        when(embeddings.embed(anyList())).thenAnswer(call -> ((List<?>) call.getArgument(0)).stream()
                .map(image -> new float[] {1, 0}).toList());
    }

    @Test
    void loadsStoredVectorsOnceAndIsReadyOnlyWithVectors() {
        UUID wine = UUID.randomUUID();
        doAnswer(call -> {
            BiConsumer<UUID, float[]> consumer = call.getArgument(2);
            consumer.accept(wine, new float[] {1, 0});
            return null;
        }).when(repository).forEachVector(eq(MODEL), eq(2), any());
        when(index.size()).thenReturn(0, 1);

        assertThat(service.isReady()).isFalse();
        assertThat(service.load()).isEqualTo(1);
        assertThat(service.load()).isZero();
        verify(index).put(eq(wine), any());
        assertThat(service.isReady()).isFalse();
        assertThat(service.isReady()).isTrue();
    }

    @Test
    void doesNothingWithoutAProvider() {
        when(embeddings.isAvailable()).thenReturn(false);
        assertThat(service.load()).isZero();
        assertThat(service.backfill(10)).isZero();
        assertThat(service.search(new byte[] {1}, "image/jpeg", 5)).isEmpty();
        verify(repository, never()).findPending(any(), anyInt(), any(), anyInt());
    }

    @Test
    void embedsReadablePendingImagesInBatchesAndStartsOverAtTheEnd() {
        List<PendingImage> pending = IntStream.range(0, 30)
                .mapToObj(i -> new PendingImage(UUID.randomUUID(), "https://images.vinnot.com/" + i + ".webp"))
                .toList();
        when(repository.findPending(eq(MODEL), eq(2), isNull(), eq(30))).thenReturn(pending);
        when(repository.findPending(eq(MODEL), eq(2), eq(pending.getLast().wineId()), eq(30))).thenReturn(List.of());
        when(images.load(any())).thenReturn(Optional.of(label));
        when(images.load(pending.getFirst().imageUrl())).thenReturn(Optional.empty());

        assertThat(service.backfill(30)).isEqualTo(29);
        verify(embeddings, times(2)).embed(anyList());
        verify(repository, never()).save(eq(pending.getFirst().wineId()), any(), any(), any());
        verify(repository).save(eq(pending.getLast().wineId()), eq(pending.getLast().imageUrl()), eq(MODEL), any());
        verify(index).put(eq(pending.getLast().wineId()), any());

        assertThat(service.backfill(30)).isZero();
        verify(repository).findPending(eq(MODEL), eq(2), eq(pending.getLast().wineId()), eq(30));
        service.backfill(30);
        verify(repository, times(2)).findPending(eq(MODEL), eq(2), isNull(), eq(30));
    }

    @Test
    void skipsABatchWhoseImagesCannotBeRead() {
        var pending = List.of(new PendingImage(UUID.randomUUID(), "https://images.vinnot.com/missing.webp"));
        when(repository.findPending(eq(MODEL), eq(2), isNull(), eq(5))).thenReturn(pending);
        when(images.load(any())).thenReturn(Optional.empty());
        assertThat(service.backfill(5)).isZero();
        verify(embeddings, never()).embed(anyList());
    }

    @Test
    void searchesThePhotoOnlyWhenTheIndexIsReady() {
        var match = new WineVisualIndexPort.VisualMatch(UUID.randomUUID(), 0.91);
        when(index.size()).thenReturn(1);
        when(index.nearest(any(), eq(5))).thenReturn(List.of(match));

        assertThat(service.search(new byte[] {1}, "image/jpeg", 5)).isEmpty();
        service.load();
        assertThat(service.search(new byte[0], "image/jpeg", 5)).isEmpty();
        assertThat(service.search(null, "image/jpeg", 5)).isEmpty();
        assertThat(service.search(new byte[] {1}, "image/jpeg", 5)).containsExactly(match);

        when(embeddings.embed(anyList())).thenThrow(new ExternalServiceUnavailableException(
                "IMAGE_EMBEDDING_UNAVAILABLE", "down", null));
        assertThat(service.search(new byte[] {1}, "image/jpeg", 5)).isEmpty();
    }

    @Test
    void searchKeepsOnlyMatchesAboveTheMinimumSimilarity() {
        UUID close = UUID.randomUUID();
        service.load();
        when(index.size()).thenReturn(2);
        when(embeddings.embed(anyList())).thenReturn(List.of(new float[] {1, 0}));
        when(index.nearest(any(), anyInt())).thenReturn(List.of(
                new WineVisualIndexPort.VisualMatch(close, 0.82),
                new WineVisualIndexPort.VisualMatch(UUID.randomUUID(), 0.41)));

        assertThat(service.search(new byte[] {1}, "image/jpeg", 10))
                .extracting(WineVisualIndexPort.VisualMatch::wineId).containsExactly(close);
        assertThat(service.startSearch(new byte[] {1}, "image/jpeg", 10).join()).hasSize(1);
    }

    @Test
    void aNotReadyIndexOrABusyExecutorGivesNoCandidatesWithoutWaiting() {
        assertThat(service.startSearch(new byte[] {1}, "image/jpeg", 10)).isCompletedWithValue(List.of());

        WineVisualIndexService busy = new WineVisualIndexService(embeddings, repository, images, index,
                task -> {
                    throw new RejectedExecutionException("full");
                }, 0.6);
        busy.load();
        when(index.size()).thenReturn(1);
        assertThat(busy.startSearch(new byte[] {1}, "image/jpeg", 10)).isCompletedWithValue(List.of());
    }

    @Test
    void awaitGivesUpOnASlowOrFailedSearch() {
        CompletableFuture<List<WineVisualIndexPort.VisualMatch>> slow = new CompletableFuture<>();
        assertThat(service.await(slow, Duration.ofMillis(10))).isEmpty();
        assertThat(slow).isCancelled();

        assertThat(service.await(CompletableFuture.failedFuture(new IllegalStateException("down")),
                Duration.ofSeconds(1))).isEmpty();
        var match = new WineVisualIndexPort.VisualMatch(UUID.randomUUID(), 0.9);
        assertThat(service.await(CompletableFuture.completedFuture(List.of(match)), Duration.ZERO))
                .containsExactly(match);
    }

    @Test
    void anInterruptedAwaitCancelsTheSearchAndKeepsTheInterruptFlag() {
        CompletableFuture<List<WineVisualIndexPort.VisualMatch>> pending = new CompletableFuture<>();
        Thread.currentThread().interrupt();
        try {
            assertThat(service.await(pending, Duration.ofSeconds(1))).isEmpty();
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
        assertThat(pending).isCancelled();
    }

    @Test
    void rejectsAMinimumSimilarityOutsideTheCosineRange() {
        assertThatThrownBy(() -> new WineVisualIndexService(embeddings, repository, images, index,
                Runnable::run, 1.5)).isInstanceOf(IllegalArgumentException.class);
    }
}
