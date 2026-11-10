package com.vinnot.marketing.domain.model;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

/**
 * How the copy was produced (#489): provider and model, the attempt count, whether it is the deterministic mock copy,
 * the fact-check verdict with its issues, and the last error while the post is still waiting for copy.
 */
public record GenerationInfo(String provider, String model, boolean mock, int attempts, Instant generatedAt, FactCheck factCheck,
        List<String> factCheckIssues, String error) {

    public GenerationInfo {
        factCheckIssues = Objects.isNull(factCheckIssues) ? List.of() : List.copyOf(factCheckIssues);
        if (attempts < 0) {
            throw new IllegalArgumentException("Attempts cannot be negative");
        }
    }

    /** No attempt yet. */
    public static GenerationInfo none() {
        return new GenerationInfo(null, null, false, 0, null, null, List.of(), null);
    }

    /** One more attempt that produced copy. */
    public GenerationInfo succeeded(String provider, String model, boolean mock, FactCheck factCheck, List<String> issues, Instant at) {
        return new GenerationInfo(provider, model, mock, attempts + 1, at, factCheck, issues, null);
    }

    /** One more attempt that failed; the previous copy, if any, stays as it was. */
    public GenerationInfo failed(String error, Instant at) {
        return new GenerationInfo(provider, model, mock, attempts + 1, generatedAt, factCheck, factCheckIssues, error);
    }
}
