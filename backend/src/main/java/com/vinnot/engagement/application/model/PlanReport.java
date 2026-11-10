package com.vinnot.engagement.application.model;

import com.vinnot.engagement.domain.model.EngagementDecision;

import java.util.EnumMap;
import java.util.Map;

/**
 * What a planner run, or one page of it, did: accounts per decision outcome, how many planned pushes were held out
 * for measurement, how many pages failed, and whether the run was skipped because another instance holds the lease.
 */
public record PlanReport(boolean skipped, int pages, int failedPages, Map<EngagementDecision.Outcome, Integer> outcomes,
        int heldOut) {
    public PlanReport {
        outcomes = Map.copyOf(outcomes);
    }

    public static PlanReport skippedRun() {
        return new PlanReport(true, 0, 0, Map.of(), 0);
    }

    public static PlanReport empty() {
        return new PlanReport(false, 0, 0, Map.of(), 0);
    }

    public int count(EngagementDecision.Outcome outcome) {
        return outcomes.getOrDefault(outcome, 0);
    }

    public PlanReport plus(PlanReport other) {
        Map<EngagementDecision.Outcome, Integer> merged = new EnumMap<>(EngagementDecision.Outcome.class);
        merged.putAll(outcomes);
        other.outcomes.forEach((outcome, count) -> merged.merge(outcome, count, Integer::sum));
        return new PlanReport(skipped || other.skipped, pages + other.pages, failedPages + other.failedPages, merged,
                heldOut + other.heldOut);
    }
}
