package com.vinnot.ai.domain.model;

import com.vinnot.shared.domain.exception.DomainException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** Validates editable content independently from HTTP response metadata. */
public final class ManualProfileContent {
    private static final Set<String> SECTIONS = Set.of("visualAnalysis", "aromaticProfile", "palateAnalysis",
            "flavorProfile", "foodPairings", "servingRecommendations");
    private static final Set<String> ARRAYS = Set.of("primaryAromas", "secondaryAromas", "primaryFlavors",
            "secondaryFlavors", "pairings", "idealOccasions", "similarWines");
    private static final Set<String> METADATA = Set.of("wineId", "language", "generatedAt", "cached",
            "fromCache", "enrichedFields", "profileContent");
    private static final double MAX_SCORE = 100;

    private ManualProfileContent() {
    }

    public static Map<String, Object> validate(Map<String, Object> input) {
        if (Objects.isNull(input) || !(input.get("summary") instanceof String summary) || summary.isBlank()) {
            throw invalid("summary must contain text");
        }
        Map<String, Object> content = new LinkedHashMap<>(input);
        METADATA.forEach(content::remove);
        for (var entry : content.entrySet()) {
            if (SECTIONS.contains(entry.getKey())) {
                if (Objects.isNull(entry.getValue())) {
                    continue;
                }
                if (!(entry.getValue() instanceof Map<?, ?> section)) {
                    throw invalid(entry.getKey() + " must be an object");
                }
                section.forEach((key, value) -> validateValue(String.valueOf(key), value));
            } else {
                validateValue(entry.getKey(), entry.getValue());
            }
        }
        return content;
    }

    private static void validateValue(String field, Object value) {
        if (Objects.isNull(value)) {
            return;
        }
        if (ARRAYS.contains(field)) {
            if (!(value instanceof List<?> values) || values.stream().anyMatch(item -> !(item instanceof String))) {
                throw invalid(field + " must be an array of text");
            }
        } else if (field.endsWith("Score")) {
            if (!(value instanceof Number number) || !Double.isFinite(number.doubleValue())
                    || number.doubleValue() < 0 || number.doubleValue() > MAX_SCORE) {
                throw invalid(field + " must be between 0 and 100");
            }
        } else if (!(value instanceof String)) {
            throw invalid(field + " must contain text");
        }
    }

    private static DomainException invalid(String message) {
        return new DomainException("INVALID_PROFILE_CONTENT", message);
    }
}
