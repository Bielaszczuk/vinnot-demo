package com.vinnot.ai.application.service;

import com.vinnot.wine.domain.model.Wine;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/** Projects legacy compound attributes without inventing individual sensory scores. */
@Service
public class WineComparisonAttributeNormalizer {
    public Map<String, Object> normalize(Map<String, Object> content) {
        if (!(content.get("attributeComparison") instanceof Map<?, ?> comparison)
                || !(comparison.get("attributes") instanceof List<?> attributes)) {
            return content;
        }
        List<Object> normalized = new ArrayList<>();
        for (Object attribute : attributes) {
            if (attribute instanceof Map<?, ?> row) {
                normalized.addAll(normalizeRow(row));
            } else {
                normalized.add(attribute);
            }
        }
        Map<String, Object> result = new HashMap<>(content);
        Map<String, Object> normalizedComparison = stringKeyMap(comparison);
        normalizedComparison.put("attributes", normalized);
        result.put("attributeComparison", normalizedComparison);
        return result;
    }

    /** Prefer known measurements, retain generated estimates and leave the provider narrative intact. */
    public Map<String, Object> normalize(Map<String, Object> content, Wine wineA, Wine wineB) {
        Map<String, Object> normalized = normalize(content);
        if (!(normalized.get("attributeComparison") instanceof Map<?, ?> comparison)
                || !(comparison.get("attributes") instanceof List<?> attributes)) {
            return normalized;
        }
        List<Object> rows = new ArrayList<>();
        for (Object attribute : attributes) {
            if (attribute instanceof Map<?, ?> row) {
                Map<String, Object> scored = stringKeyMap(row);
                Integer scoreA = catalogScore(row, wineA);
                Integer scoreB = catalogScore(row, wineB);
                if (Objects.nonNull(scoreA)) {
                    scored.put("wineAScore", scoreA);
                }
                if (Objects.nonNull(scoreB)) {
                    scored.put("wineBScore", scoreB);
                }
                synchronizeKnownValue(scored, "wineAValue", scoreA);
                synchronizeKnownValue(scored, "wineBValue", scoreB);
                rows.add(scored);
            } else {
                rows.add(attribute);
            }
        }
        Map<String, Object> result = new HashMap<>(normalized);
        Map<String, Object> table = stringKeyMap(comparison);
        table.put("attributes", rows);
        result.put("attributeComparison", table);
        return result;
    }

    private void synchronizeKnownValue(Map<String, Object> row, String key, Integer score) {
        if (Objects.isNull(score)) {
            return;
        }
        Object value = row.get(key);
        boolean unknown = value instanceof String text
                && (text.strip().equalsIgnoreCase("No documentado") || text.strip().equalsIgnoreCase("Not documented"));
        if (score == 0 || unknown) {
            row.put(key, score + "/100");
        }
    }

    private Integer catalogScore(Map<?, ?> row, Wine wine) {
        var taste = wine.getTasteProfile();
        if (Objects.isNull(taste)) {
            return null;
        }
        // The stable key wins; the localized name is only a fallback for legacy rows.
        String axis = row.get("key") instanceof String key && !key.isBlank()
                ? key.strip() : axisFromName(row.get("name"));
        if (Objects.isNull(axis)) {
            return null;
        }
        return switch (axis) {
            case "body" -> taste.getBody();
            case "tannin" -> taste.getTannin();
            case "acidity" -> taste.getAcidity();
            case "sweetness" -> taste.getSweetness();
            default -> null;
        };
    }

    /** Legacy rows carry only a localized name. */
    private String axisFromName(Object name) {
        if (!(name instanceof String text)) {
            return null;
        }
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFKD).replaceAll("\\p{M}", "")
                .strip().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "cuerpo", "body" -> "body";
            case "taninos", "tannin", "tannins" -> "tannin";
            case "acidez", "acidity" -> "acidity";
            case "dulzor", "sweetness" -> "sweetness";
            default -> null;
        };
    }

    private List<Map<String, Object>> normalizeRow(Map<?, ?> row) {
        List<String> names = segments(row.get("name"));
        if (names.size() < 2) {
            return List.of(stringKeyMap(row));
        }
        Map<String, Object> unscored = stringKeyMap(row);
        // A score for several attributes cannot be assigned to each individual attribute.
        unscored.remove("wineAScore");
        unscored.remove("wineBScore");
        List<String> valuesA = segments(row.get("wineAValue"));
        List<String> valuesB = segments(row.get("wineBValue"));
        if (names.contains("") || valuesA.contains("") || valuesB.contains("")
                || names.size() != valuesA.size() || names.size() != valuesB.size()) {
            return List.of(unscored);
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (int index = 0; index < names.size(); index++) {
            Map<String, Object> item = new HashMap<>(unscored);
            item.put("name", names.get(index));
            item.put("wineAValue", valuesA.get(index));
            item.put("wineBValue", valuesB.get(index));
            result.add(item);
        }
        return result;
    }

    private List<String> segments(Object value) {
        return value instanceof String text
                ? Arrays.stream(text.split("/", -1)).map(String::trim).toList()
                : List.of();
    }

    private Map<String, Object> stringKeyMap(Map<?, ?> source) {
        Map<String, Object> result = new HashMap<>();
        source.forEach((key, value) -> result.put(String.valueOf(key), value));
        return result;
    }
}
