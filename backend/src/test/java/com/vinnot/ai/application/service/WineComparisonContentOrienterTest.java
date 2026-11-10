package com.vinnot.ai.application.service;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class WineComparisonContentOrienterTest {

    private final WineComparisonContentOrienter orienter =
            new WineComparisonContentOrienter();

    @Test
    void keepsCanonicalContentUntouchedWhenNoReorientationIsRequired() {
        Map<String, Object> content = Map.of("summary", "canonical");

        assertThat(orienter.orient(content, false)).isSameAs(content);
    }

    @Test
    void swapsEveryStructuredWineSideWithoutMutatingTheCachedContent() {
        Map<String, Object> attribute = Map.of(
                "name", "Body",
                "wineAValue", "Light",
                "wineBValue", "Full",
                "wineAScore", 25,
                "wineBScore", 90);
        Map<String, Object> canonical = Map.of(
                "recommendationWineA", "Choose A",
                "recommendationWineB", "Choose B",
                "bestFor", Map.of("wineA", List.of("Lunch"),
                        "wineB", List.of("Dinner")),
                "attributeComparison", Map.of("attributes", List.of(attribute)));

        Map<String, Object> oriented = orienter.orient(canonical, true);

        assertThat(oriented)
                .containsEntry("recommendationWineA", "Choose B")
                .containsEntry("recommendationWineB", "Choose A");
        Map<?, ?> bestFor = (Map<?, ?>) oriented.get("bestFor");
        assertThat(bestFor.get("wineA")).isEqualTo(List.of("Dinner"));
        assertThat(bestFor.get("wineB")).isEqualTo(List.of("Lunch"));
        Map<?, ?> comparison = (Map<?, ?>) oriented.get("attributeComparison");
        Map<?, ?> orientedAttribute = (Map<?, ?>) ((List<?>)
                comparison.get("attributes")).getFirst();
        assertThat(orientedAttribute.get("wineAValue")).isEqualTo("Full");
        assertThat(orientedAttribute.get("wineBValue")).isEqualTo("Light");
        assertThat(orientedAttribute.get("wineAScore")).isEqualTo(90);
        assertThat(orientedAttribute.get("wineBScore")).isEqualTo(25);
        assertThat(attribute).containsEntry("wineAValue", "Light");
    }

    @Test
    void swapsEveryAdditiveWineSideAndFlipsChooseIfPicks() {
        Map<String, Object> notesA = Map.of("identity", "A identity", "nose", "A nose");
        Map<String, Object> notesB = Map.of("identity", "B identity", "nose", "B nose");
        Map<String, Object> shared = Map.of("dish", "Shared dish", "why", "Both");
        Map<String, Object> keyed = Map.of("key", "sweetness", "name", "Sweetness",
                "wineAValue", "Dry", "wineBValue", "Off-dry", "wineAScore", 5, "wineBScore", 30);
        Map<String, Object> canonical = new HashMap<>();
        canonical.put("tastingNotes", Map.of("wineA", notesA, "wineB", notesB));
        canonical.put("chooseIf", List.of(
                Map.of("pick", "A", "situation", "Grill", "why", "Tannin"),
                Map.of("pick", "B", "situation", "Fish", "why", "Acidity"),
                "unknown"));
        canonical.put("pairings", Map.of("wineA", List.of(Map.of("dish", "Steak")),
                "wineB", List.of(Map.of("dish", "Trout")), "shared", shared));
        canonical.put("serving", Map.of("wineA", Map.of("temperature", "17 °C"),
                "wineB", Map.of("temperature", "9 °C")));
        canonical.put("aging", Map.of("wineA", "Ten years", "wineB", "Drink now"));
        canonical.put("value", "A costs more");
        canonical.put("attributeComparison", Map.of("attributes", List.of(keyed)));

        Map<String, Object> oriented = orienter.orient(canonical, true);

        assertThat(map(oriented.get("tastingNotes")))
                .containsEntry("wineA", notesB).containsEntry("wineB", notesA);
        assertThat(oriented.get("chooseIf")).isEqualTo(List.of(
                Map.of("pick", "B", "situation", "Grill", "why", "Tannin"),
                Map.of("pick", "A", "situation", "Fish", "why", "Acidity"),
                "unknown"));
        assertThat(map(oriented.get("pairings")))
                .containsEntry("wineA", List.of(Map.of("dish", "Trout")))
                .containsEntry("wineB", List.of(Map.of("dish", "Steak")))
                .containsEntry("shared", shared);
        assertThat(map(oriented.get("serving")))
                .containsEntry("wineA", Map.of("temperature", "9 °C"))
                .containsEntry("wineB", Map.of("temperature", "17 °C"));
        assertThat(map(oriented.get("aging")))
                .containsEntry("wineA", "Drink now").containsEntry("wineB", "Ten years");
        assertThat(oriented).containsEntry("value", "A costs more");
        Map<String, Object> row = map(((List<?>) map(oriented.get("attributeComparison"))
                .get("attributes")).getFirst());
        assertThat(row).containsEntry("key", "sweetness").containsEntry("name", "Sweetness")
                .containsEntry("wineAValue", "Off-dry").containsEntry("wineAScore", 30);
        assertThat(map(canonical.get("tastingNotes"))).containsEntry("wineA", notesA);
        assertThat(map(((List<?>) canonical.get("chooseIf")).getFirst())).containsEntry("pick", "A");
    }

    @Test
    void orientsLegacyContentWithoutAdditiveFieldsAsBefore() {
        List<String> names = List.of("Cuerpo", "Taninos", "Acidez", "Intensidad Frutal", "Complejidad", "Final");
        List<Map<String, Object>> rows = names.stream().map(name -> Map.<String, Object>of(
                "name", name, "wineAValue", name + " A", "wineBValue", name + " B",
                "wineAScore", 10, "wineBScore", 90)).toList();
        Map<String, Object> legacy = Map.of("summary", "Legacy", "recommendationWineA", "A",
                "recommendationWineB", "B", "bestFor", Map.of("wineA", List.of("a"), "wineB", List.of("b")),
                "attributeComparison", Map.of("attributes", rows));

        Map<String, Object> oriented = orienter.orient(legacy, true);

        assertThat(oriented).containsOnlyKeys(legacy.keySet())
                .containsEntry("recommendationWineA", "B").containsEntry("summary", "Legacy");
        List<?> orientedRows = (List<?>) ((Map<?, ?>) oriented.get("attributeComparison")).get("attributes");
        for (int index = 0; index < names.size(); index++) {
            assertThat(map(orientedRows.get(index))).containsOnlyKeys(rows.get(index).keySet())
                    .containsEntry("name", names.get(index))
                    .containsEntry("wineAValue", names.get(index) + " B").containsEntry("wineAScore", 90);
        }
    }

    @Test
    void preservesMalformedAdditiveFragments() {
        Map<String, Object> oriented = orienter.orient(Map.of("tastingNotes", "text", "chooseIf", "text",
                "pairings", "text", "serving", List.of(), "aging", 7), true);
        assertThat(oriented).containsEntry("tastingNotes", "text").containsEntry("chooseIf", "text")
                .containsEntry("pairings", "text").containsEntry("serving", List.of()).containsEntry("aging", 7);
        assertThat(orienter.orient(Map.of("chooseIf", List.of(Map.of("pick", "C"), Map.of("situation", "x"))), true)
                .get("chooseIf")).isEqualTo(List.of(Map.of("pick", "C"), Map.of("situation", "x")));
    }

    @Test
    void preservesMalformedProviderFragmentsInsteadOfFailingTheResponse() {
        assertThat(orienter.orient(Map.of("bestFor", "unknown"), true))
                .containsEntry("bestFor", "unknown");
        assertThat(orienter.orient(
                Map.of("attributeComparison", "unknown"), true))
                .containsEntry("attributeComparison", "unknown");

        Map<String, Object> noList = orienter.orient(
                Map.of("attributeComparison", Map.of("attributes", "unknown")), true);
        Map<?, ?> noListComparison = (Map<?, ?>) noList.get("attributeComparison");
        assertThat(noListComparison.get("attributes")).isEqualTo("unknown");

        Map<String, Object> mixed = orienter.orient(
                Map.of(
                        "bestFor", Map.of("occasion", "shared"),
                        "attributeComparison", Map.of(
                                "attributes", List.of("unknown", Map.of("name", "Body")))),
                true);
        Map<?, ?> comparison = (Map<?, ?>) mixed.get("attributeComparison");
        assertThat(comparison.get("attributes"))
                .isEqualTo(List.of("unknown", Map.of("name", "Body")));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> map(Object value) {
        return (Map<String, Object>) value;
    }
}
