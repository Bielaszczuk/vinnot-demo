package com.vinnot.wine.domain.model;

/**
 * Deterministically scored catalog candidate.
 */
public record RankedWineLabelCandidate(
        WineLabelCandidate candidate,
        double score
) {
}
