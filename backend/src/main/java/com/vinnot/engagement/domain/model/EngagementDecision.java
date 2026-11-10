package com.vinnot.engagement.domain.model;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

/**
 * What the planner decided for one account today: the push it chose and when it goes out, or why there is none.
 *
 * @param candidate the chosen push, present only when {@code outcome} is {@link Outcome#PLANNED}
 */
public record EngagementDecision(Outcome outcome, EngagementCandidate candidate, Instant sendAt) {
    public enum Outcome { PLANNED, NO_CANDIDATE, OVER_BUDGET, FATIGUED, PAUSED, BELOW_SCORE, TOO_LATE }

    public EngagementDecision {
        Objects.requireNonNull(outcome, "outcome");
        if ((outcome == Outcome.PLANNED) != Objects.nonNull(candidate)) {
            throw new IllegalArgumentException("Only a planned decision has a candidate");
        }
    }

    public static EngagementDecision none(Outcome outcome) {
        return new EngagementDecision(outcome, null, null);
    }

    public Optional<EngagementCandidate> chosen() {
        return Optional.ofNullable(candidate);
    }
}
