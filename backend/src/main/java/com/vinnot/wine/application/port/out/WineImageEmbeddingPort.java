package com.vinnot.wine.application.port.out;

import java.util.List;

/**
 * Driven port for a provider that turns label images into comparable vectors. Vectors of the same model and
 * dimensions are comparable by cosine similarity.
 */
public interface WineImageEmbeddingPort {

    boolean isAvailable();

    /** Stable identity of the model and its settings; a change re-embeds the catalog. */
    String modelId();

    int dimensions();

    /** One vector per image, in the order given; every image is a JPEG, PNG or WebP. */
    List<float[]> embed(List<LabelImage> images);

    record LabelImage(byte[] bytes, String contentType) {
    }
}
