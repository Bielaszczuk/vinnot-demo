package com.vinnot.wine.domain.model;

public record WineContentSafetyReview(
        boolean completed,
        boolean safe,
        String reason
) {
}
