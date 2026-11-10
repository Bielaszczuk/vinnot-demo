package com.vinnot.ai.application.service;

import com.vinnot.ai.domain.valueobject.AiContentLanguage;
import com.vinnot.wine.domain.model.Wine;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

final class WineComparisonTestData {

    private WineComparisonTestData() {
    }

    static MultilingualAiContent bundle(Wine first, Wine second) {
        Map<AiContentLanguage, Map<String, Object>> translations = new EnumMap<>(AiContentLanguage.class);
        for (AiContentLanguage language : AiContentLanguage.values()) {
            translations.put(language, content(first, second, language));
        }
        return MultilingualAiContent.of(translations);
    }

    static Map<String, Object> response(Wine first, Wine second) {
        Map<String, Object> translations = new HashMap<>();
        bundle(first, second).translations().forEach((key, value) -> translations.put(key.code(), value));
        return Map.of("translations", translations);
    }

    static Map<String, Object> content(Wine first, Wine second, AiContentLanguage language) {
        boolean spanish = language == AiContentLanguage.SPANISH;
        Map<String, Object> content = new HashMap<>();
        content.put("summary", first.getName() + (spanish ? " y " : " and ") + second.getName()
                + (spanish ? ": el catálogo no documenta diferencias sensoriales." : ": sensory differences are not documented."));
        content.put("recommendation", first.getName() + " / " + second.getName()
                + (spanish ? ": no hay evidencia para elegir un ganador." : ": there is no evidence to prefer either wine."));
        content.put("recommendationWineA", first.getName() + (spanish ? ": consultar ficha técnica." : ": check the technical sheet."));
        content.put("recommendationWineB", second.getName() + (spanish ? ": consultar ficha técnica." : ": check the technical sheet."));
        content.put("keyDifferences", List.of());
        content.put("similarities", List.of());
        content.put("bestFor", Map.of("wineA", List.of(), "wineB", List.of()));
        List<Map<String, Object>> attributes = new ArrayList<>();
        for (WineComparisonPromptLocale.Attribute attribute : WineComparisonPromptLocale.from(language).attributes()) {
            Map<String, Object> row = new HashMap<>();
            row.put("key", attribute.key());
            row.put("name", attribute.name());
            row.put("wineAValue", spanish ? "No documentado" : "Not documented");
            row.put("wineBValue", spanish ? "No documentado" : "Not documented");
            row.put("wineAScore", null);
            row.put("wineBScore", null);
            attributes.add(row);
        }
        content.put("attributeComparison", Map.of("attributes", attributes));
        content.put("tastingNotes", new HashMap<>(Map.of(
                "wineA", tastingNote(first.getName()), "wineB", tastingNote(second.getName()))));
        content.put("chooseIf", new ArrayList<>(List.of(
                choice("A", first.getName()), choice("B", second.getName()))));
        Map<String, Object> pairings = new HashMap<>();
        pairings.put("wineA", List.of(pairing("Dish for " + first.getName())));
        pairings.put("wineB", List.of(pairing("Dish for " + second.getName())));
        pairings.put("shared", null);
        content.put("pairings", pairings);
        content.put("serving", new HashMap<>(Map.of(
                "wineA", serving("16-18 °C"), "wineB", serving("8-10 °C"))));
        content.put("aging", new HashMap<>(Map.of(
                "wineA", first.getName() + " window", "wineB", second.getName() + " window")));
        content.put("value", null);
        return content;
    }

    static Map<String, Object> tastingNote(String name) {
        return new HashMap<>(Map.of("identity", name + " identity", "appearance", name + " appearance",
                "nose", name + " nose", "palate", name + " palate", "finish", name + " finish"));
    }

    static Map<String, Object> choice(String pick, String situation) {
        return new HashMap<>(Map.of("pick", pick, "situation", situation + " situation", "why", situation + " why"));
    }

    static Map<String, Object> pairing(String dish) {
        return new HashMap<>(Map.of("dish", dish, "why", dish + " why"));
    }

    static Map<String, Object> serving(String temperature) {
        return new HashMap<>(Map.of("temperature", temperature, "decanting", "No decanting"));
    }
}
