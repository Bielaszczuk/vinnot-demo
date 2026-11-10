package com.vinnot.ai.application.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Comparison for the requested wine order. The wine-specific sections are additive and stay null for
 * legacy cached content; {@code comparisonContent} keeps the raw localized document.
 */
public record WineComparisonResponse(
        UUID wineAId,
        String wineAName,
        UUID wineBId,
        String wineBName,
        String language,
        Instant generatedAt,
        boolean cached,
        String summary,
        List<String> keyDifferences,
        List<String> similarities,
        Map<String, Object> attributeComparison,
        Map<String, Object> bestFor,
        String recommendation,
        String recommendationWineA,
        String recommendationWineB,
        TastingNotes tastingNotes,
        List<ChooseIf> chooseIf,
        Pairings pairings,
        ServingAdvice serving,
        Aging aging,
        String value,
        Map<String, Object> comparisonContent
) {

    /** Sensory reading of one wine; {@code identity} names the anchor that sets it apart. */
    public record TastingNote(String identity, String appearance, String nose, String palate, String finish) {
    }

    public record TastingNotes(TastingNote wineA, TastingNote wineB) {
    }

    /** A situation in which to pick wine "A" or "B", with the reason. */
    public record ChooseIf(String pick, String situation, String why) {
    }

    public record Pairing(String dish, String why) {
    }

    /** Dishes per wine plus an optional dish that suits both. */
    public record Pairings(List<Pairing> wineA, List<Pairing> wineB, Pairing shared) {
    }

    public record Serving(String temperature, String decanting) {
    }

    public record ServingAdvice(Serving wineA, Serving wineB) {
    }

    /** Drinking window of each wine. */
    public record Aging(String wineA, String wineB) {
    }

    @SuppressWarnings("unchecked")
    public static WineComparisonResponse from(
            UUID wineAId,
            String wineAName,
            UUID wineBId,
            String wineBName,
            String language,
            Map<String, Object> comparisonJson,
            Instant generatedAt,
            boolean cached) {

        List<String> keyDifferences = (List<String>) comparisonJson.get("keyDifferences");
        if (Objects.isNull(keyDifferences)) {
            keyDifferences = (List<String>) comparisonJson.get("differences");
        }

        return new WineComparisonResponse(
                wineAId,
                wineAName,
                wineBId,
                wineBName,
                language,
                generatedAt,
                cached,
                (String) comparisonJson.get("summary"),
                keyDifferences,
                (List<String>) comparisonJson.get("similarities"),
                (Map<String, Object>) comparisonJson.get("attributeComparison"),
                (Map<String, Object>) comparisonJson.get("bestFor"),
                (String) comparisonJson.get("recommendation"),
                (String) comparisonJson.get("recommendationWineA"),
                (String) comparisonJson.get("recommendationWineB"),
                tastingNotes(comparisonJson.get("tastingNotes")),
                chooseIf(comparisonJson.get("chooseIf")),
                pairings(comparisonJson.get("pairings")),
                serving(comparisonJson.get("serving")),
                aging(comparisonJson.get("aging")),
                text(comparisonJson.get("value")),
                comparisonJson
        );
    }

    private static TastingNotes tastingNotes(Object value) {
        if (!(value instanceof Map<?, ?> sides)) {
            return null;
        }
        return new TastingNotes(tastingNote(sides.get("wineA")), tastingNote(sides.get("wineB")));
    }

    private static TastingNote tastingNote(Object value) {
        if (!(value instanceof Map<?, ?> note)) {
            return null;
        }
        return new TastingNote(text(note.get("identity")), text(note.get("appearance")), text(note.get("nose")),
                text(note.get("palate")), text(note.get("finish")));
    }

    private static List<ChooseIf> chooseIf(Object value) {
        if (!(value instanceof List<?> choices)) {
            return null;
        }
        return choices.stream().filter(Map.class::isInstance).map(Map.class::cast)
                .map(choice -> new ChooseIf(text(choice.get("pick")), text(choice.get("situation")),
                        text(choice.get("why"))))
                .toList();
    }

    private static Pairings pairings(Object value) {
        if (!(value instanceof Map<?, ?> sides)) {
            return null;
        }
        return new Pairings(dishes(sides.get("wineA")), dishes(sides.get("wineB")), pairing(sides.get("shared")));
    }

    private static List<Pairing> dishes(Object value) {
        if (!(value instanceof List<?> dishes)) {
            return List.of();
        }
        return dishes.stream().map(WineComparisonResponse::pairing).filter(Objects::nonNull).toList();
    }

    private static Pairing pairing(Object value) {
        if (!(value instanceof Map<?, ?> dish)) {
            return null;
        }
        return new Pairing(text(dish.get("dish")), text(dish.get("why")));
    }

    private static ServingAdvice serving(Object value) {
        if (!(value instanceof Map<?, ?> sides)) {
            return null;
        }
        return new ServingAdvice(servingSide(sides.get("wineA")), servingSide(sides.get("wineB")));
    }

    private static Serving servingSide(Object value) {
        if (!(value instanceof Map<?, ?> serving)) {
            return null;
        }
        return new Serving(text(serving.get("temperature")), text(serving.get("decanting")));
    }

    private static Aging aging(Object value) {
        if (!(value instanceof Map<?, ?> sides)) {
            return null;
        }
        return new Aging(text(sides.get("wineA")), text(sides.get("wineB")));
    }

    private static String text(Object value) {
        return value instanceof String string ? string : null;
    }
}
