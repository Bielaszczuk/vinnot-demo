package com.vinnot.marketing.application.model;

import java.util.List;

/** The verdict of the fact-checking completion. */
public record FactCheckResult(boolean ok, List<String> issues) {
    public FactCheckResult {
        issues = List.copyOf(issues);
    }
}
