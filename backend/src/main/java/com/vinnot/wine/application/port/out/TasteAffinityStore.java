package com.vinnot.wine.application.port.out;

import java.time.Instant;

/** Stored taste affinities (#306). */
public interface TasteAffinityStore {
    /**
     * Replaces every affinity with one computed from the users' own ratings: a review rating, or the cellar rating of a
     * wine they did not review. Rejected reviews do not count. One row per user and normalised grape name, and per user
     * and wine type, with the average rating and how many rated wines it comes from.
     *
     * @return how many affinities were stored
     */
    int recompute(Instant computedAt);
}
