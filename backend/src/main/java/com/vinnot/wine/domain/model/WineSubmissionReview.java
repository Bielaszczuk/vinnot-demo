package com.vinnot.wine.domain.model;

public record WineSubmissionReview(
        boolean completed,
        boolean safe,
        boolean wineRelated,
        double confidence,
        String reason,
        String inferredWineType
) {

    public boolean permitsAutomaticPublication() {
        return completed && safe && wineRelated;
    }
}
