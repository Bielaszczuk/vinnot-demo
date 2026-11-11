package com.vinnot.wine.application.port.out;

import java.util.List;
import java.util.UUID;
import java.util.function.BiConsumer;

/** Driven port persisting catalog image embeddings across restarts. */
public interface WineImageEmbeddingRepositoryPort {

    /**
     * Active wines whose Vinnot-hosted label image has no embedding of this model and size yet, or whose image
     * changed since it was embedded, in wine order after the given wine (null to start).
     */
    List<PendingImage> findPending(String modelId, int dimensions, UUID after, int limit);

    void save(UUID wineId, String imageUrl, String modelId, float[] vector);

    /** Streams every stored vector of this model and size, for an active wine that still shows that image. */
    void forEachVector(String modelId, int dimensions, BiConsumer<UUID, float[]> consumer);

    record PendingImage(UUID wineId, String imageUrl) {
    }
}
