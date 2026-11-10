package com.vinnot.wine.application.port.out;

import java.util.List;
import java.util.Objects;

/**
 * Provider-independent catalog retrieval criteria derived from visible label
 * evidence. Identity terms are deliberately field-agnostic because a public
 * brand can be stored as either a wine name or a winery name.
 */
public record WineLabelSearchCriteria(
        List<String> identityTerms,
        Integer vintage,
        String grapeVariety,
        String wineType,
        int limit
) {

    public WineLabelSearchCriteria {
        identityTerms = Objects.nonNull(identityTerms)
                ? identityTerms.stream()
                        .filter(Objects::nonNull)
                        .map(String::trim)
                        .filter(term -> !term.isBlank())
                        .distinct()
                        .toList()
                : List.of();
        if (limit <= 0) {
            throw new IllegalArgumentException("Candidate limit must be positive");
        }
    }
}
