package com.vinnot.ai.application.service;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Reorients the structured A/B fields of a canonical cached comparison. */
@Service
public class WineComparisonContentOrienter {

    private static final List<String> PER_WINE_SECTIONS = List.of(
            "bestFor", "tastingNotes", "pairings", "serving", "aging");
    private static final Map<String, String> PICK_FLIPS = Map.of("A", "B", "B", "A");

    public Map<String, Object> orient(
            Map<String, Object> canonicalContent,
            boolean reverse) {
        if (!reverse) {
            return canonicalContent;
        }

        Map<String, Object> oriented = new HashMap<>(canonicalContent);
        swap(oriented, "recommendationWineA", "recommendationWineB");
        // pairings.shared and value describe both wines, so only their per-wine sides move.
        for (String section : PER_WINE_SECTIONS) {
            oriented.computeIfPresent(section, (key, value) -> orientSides(value));
        }
        oriented.computeIfPresent("chooseIf", (key, value) -> orientChoices(value));
        oriented.computeIfPresent(
                "attributeComparison",
                (key, value) -> orientAttributeComparison(value));
        return oriented;
    }

    private Object orientSides(Object value) {
        if (!(value instanceof Map<?, ?> source)) {
            return value;
        }
        Map<String, Object> sides = stringKeyMap(source);
        swap(sides, "wineA", "wineB");
        return sides;
    }

    private Object orientChoices(Object value) {
        if (!(value instanceof List<?> choices)) {
            return value;
        }
        List<Object> oriented = new ArrayList<>();
        for (Object choice : choices) {
            if (choice instanceof Map<?, ?> source && source.get("pick") instanceof String pick
                    && PICK_FLIPS.containsKey(pick)) {
                Map<String, Object> flipped = stringKeyMap(source);
                flipped.put("pick", PICK_FLIPS.get(pick));
                oriented.add(flipped);
            } else {
                oriented.add(choice);
            }
        }
        return oriented;
    }

    private Object orientAttributeComparison(Object value) {
        if (!(value instanceof Map<?, ?> source)) {
            return value;
        }
        Map<String, Object> comparison = stringKeyMap(source);
        Object attributes = comparison.get("attributes");
        if (!(attributes instanceof List<?> sourceAttributes)) {
            return comparison;
        }

        List<Object> orientedAttributes = new ArrayList<>();
        for (Object attribute : sourceAttributes) {
            if (attribute instanceof Map<?, ?> sourceAttribute) {
                Map<String, Object> orientedAttribute = stringKeyMap(sourceAttribute);
                swap(orientedAttribute, "wineAValue", "wineBValue");
                swap(orientedAttribute, "wineAScore", "wineBScore");
                orientedAttributes.add(orientedAttribute);
            } else {
                orientedAttributes.add(attribute);
            }
        }
        comparison.put("attributes", orientedAttributes);
        return comparison;
    }

    private Map<String, Object> stringKeyMap(Map<?, ?> source) {
        Map<String, Object> result = new HashMap<>();
        source.forEach((key, value) -> result.put(String.valueOf(key), value));
        return result;
    }

    private void swap(Map<String, Object> content, String left, String right) {
        if (!content.containsKey(left) && !content.containsKey(right)) {
            return;
        }
        Object leftValue = content.get(left);
        content.put(left, content.get(right));
        content.put(right, leftValue);
    }
}
