package com.vinnot.wine.application.port.out;

import java.util.List;

/**
 * Driven port for a provider that turns label images into comparable vectors. Vectors of the same model and
 * dimensions are comparable by cosine similarity.
 */
public interface WineImageEmbeddingPort {

    /**
     * Error code of an {@code ExternalServiceUnavailableException} thrown when the provider refuses for quota or
     * rate limits (HTTP 402 or 429): callers should wait before trying again instead of retrying at once.
     */
    String PROVIDER_LIMITED = "IMAGE_EMBEDDING_LIMITED";

    boolean isAvailable();

    /** Stable identity of the model and its settings; a change re-embeds the catalog. */
    String modelId();

    int dimensions();

    /** One vector per image, in the order given; every image is a JPEG, PNG or WebP. */
    List<float[]> embed(List<LabelImage> images);

    record LabelImage(byte[] bytes, String contentType) {
    }
}
