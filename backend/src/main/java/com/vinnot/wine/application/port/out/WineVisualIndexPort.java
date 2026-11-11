package com.vinnot.wine.application.port.out;

import java.util.List;
import java.util.UUID;

/** Driven port for the nearest-neighbour index of catalog label images. */
public interface WineVisualIndexPort {

    /** Adds or replaces the vector of one wine. */
    void put(UUID wineId, float[] vector);

    void remove(UUID wineId);

    int size();

    /** The most similar wines, most similar first, with their cosine similarity. */
    List<VisualMatch> nearest(float[] query, int limit);

    record VisualMatch(UUID wineId, double similarity) {
    }
}
