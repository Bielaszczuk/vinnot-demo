package com.vinnot.engagement.domain.model;

import com.vinnot.notification.domain.model.NotificationType;

import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * One push the planner could send an account today: its type, the content it suggests (never suggested to the same
 * account twice), the template data and the signals it is scored by.
 */
public record EngagementCandidate(UUID userId, NotificationType type, String contentRef, Map<String, String> data,
        CandidateSignals signals) {
    private static final double HALF = 0.5;

    public EngagementCandidate {
        Objects.requireNonNull(userId, "userId");
        Objects.requireNonNull(type, "type");
        Objects.requireNonNull(signals, "signals");
        if (!type.engagement()) {
            throw new IllegalArgumentException(type + " is not an engagement push");
        }
        data = Map.copyOf(Objects.requireNonNullElse(data, Map.of()));
    }

    /** 0-1: the type's weight scaled by the strength of the signals, between half and all of that weight. */
    public double score() {
        return EngagementRules.of(type).weight() * (HALF + HALF * signals.strength());
    }
}
