package com.vinnot.ai.application.dto;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class WineComparisonResponseTest {

    private final UUID wineAId = UUID.randomUUID();
    private final UUID wineBId = UUID.randomUUID();

    @Test
    void exposesTheAdditiveSectionsAsTypedFieldsAndKeepsTheRawContent() {
        Map<String, Object> content = new HashMap<>(legacy());
        content.put("tastingNotes", Map.of(
                "wineA", note("A"), "wineB", note("B")));
        content.put("chooseIf", List.of(
                Map.of("pick", "A", "situation", "Grill", "why", "Firm tannin"),
                Map.of("pick", "B", "situation", "Trout", "why", "High acidity")));
        Map<String, Object> pairings = new HashMap<>();
        pairings.put("wineA", List.of(Map.of("dish", "Bife", "why", "Tannin")));
        pairings.put("wineB", List.of(Map.of("dish", "Trucha", "why", "Acidity")));
        pairings.put("shared", Map.of("dish", "Hongos", "why", "Earthy"));
        content.put("pairings", pairings);
        content.put("serving", Map.of(
                "wineA", Map.of("temperature", "17 °C", "decanting", "45 minutes"),
                "wineB", Map.of("temperature", "9 °C", "decanting", "None")));
        content.put("aging", Map.of("wineA", "Until 2032", "wineB", "Drink now"));
        content.put("value", "A costs twice as much");

        var response = response(content);

        assertThat(response.tastingNotes().wineA())
                .isEqualTo(new WineComparisonResponse.TastingNote("A identity", "A appearance", "A nose",
                        "A palate", "A finish"));
        assertThat(response.tastingNotes().wineB().identity()).isEqualTo("B identity");
        assertThat(response.chooseIf()).containsExactly(
                new WineComparisonResponse.ChooseIf("A", "Grill", "Firm tannin"),
                new WineComparisonResponse.ChooseIf("B", "Trout", "High acidity"));
        assertThat(response.pairings().wineA()).containsExactly(new WineComparisonResponse.Pairing("Bife", "Tannin"));
        assertThat(response.pairings().wineB()).containsExactly(new WineComparisonResponse.Pairing("Trucha", "Acidity"));
        assertThat(response.pairings().shared()).isEqualTo(new WineComparisonResponse.Pairing("Hongos", "Earthy"));
        assertThat(response.serving().wineA()).isEqualTo(new WineComparisonResponse.Serving("17 °C", "45 minutes"));
        assertThat(response.serving().wineB().temperature()).isEqualTo("9 °C");
        assertThat(response.aging()).isEqualTo(new WineComparisonResponse.Aging("Until 2032", "Drink now"));
        assertThat(response.value()).isEqualTo("A costs twice as much");
        assertThat(response.comparisonContent()).isSameAs(content);
        assertThat(response.summary()).isEqualTo("Legacy summary");
    }

    @Test
    void serializesTheAdditiveContractNames() throws Exception {
        Map<String, Object> content = new HashMap<>(legacy());
        content.put("chooseIf", List.of(Map.of("pick", "A", "situation", "Grill", "why", "Tannin")));
        content.put("pairings", Map.of("wineA", List.of(), "wineB", List.of()));

        JsonNode json = new ObjectMapper().valueToTree(response(content));

        assertThat(json.path("chooseIf").get(0).path("pick").asText()).isEqualTo("A");
        assertThat(json.path("pairings").path("shared").isNull()).isTrue();
        assertThat(json.has("tastingNotes")).isTrue();
        assertThat(json.has("serving")).isTrue();
        assertThat(json.has("aging")).isTrue();
        assertThat(json.has("value")).isTrue();
        assertThat(json.path("recommendationWineA").asText()).isEqualTo("Legacy A");
    }

    @Test
    void leavesTheAdditiveFieldsNullForLegacyContent() {
        var response = response(legacy());

        assertThat(response.tastingNotes()).isNull();
        assertThat(response.chooseIf()).isNull();
        assertThat(response.pairings()).isNull();
        assertThat(response.serving()).isNull();
        assertThat(response.aging()).isNull();
        assertThat(response.value()).isNull();
        assertThat(response.keyDifferences()).containsExactly("Legacy difference");
        assertThat(response.bestFor()).containsKeys("wineA", "wineB");
    }

    @Test
    void toleratesMalformedAdditiveSectionsWithoutFailingTheResponse() {
        Map<String, Object> content = new HashMap<>(legacy());
        content.put("tastingNotes", "text");
        content.put("chooseIf", List.of("text", Map.of("pick", 3)));
        content.put("pairings", Map.of("wineA", "text", "shared", "text"));
        content.put("serving", List.of());
        content.put("aging", Map.of("wineA", 5));
        content.put("value", 42);

        var response = response(content);

        assertThat(response.tastingNotes()).isNull();
        assertThat(response.chooseIf()).containsExactly(new WineComparisonResponse.ChooseIf(null, null, null));
        assertThat(response.pairings().wineA()).isEmpty();
        assertThat(response.pairings().shared()).isNull();
        assertThat(response.serving()).isNull();
        assertThat(response.aging()).isEqualTo(new WineComparisonResponse.Aging(null, null));
        assertThat(response.value()).isNull();
    }

    private WineComparisonResponse response(Map<String, Object> content) {
        return WineComparisonResponse.from(wineAId, "A", wineBId, "B", "en", content, Instant.EPOCH, true);
    }

    private Map<String, Object> note(String side) {
        return Map.of("identity", side + " identity", "appearance", side + " appearance", "nose", side + " nose",
                "palate", side + " palate", "finish", side + " finish");
    }

    private Map<String, Object> legacy() {
        return Map.of("summary", "Legacy summary", "keyDifferences", List.of("Legacy difference"),
                "similarities", List.of("Legacy similarity"), "recommendation", "Legacy verdict",
                "recommendationWineA", "Legacy A", "recommendationWineB", "Legacy B",
                "bestFor", Map.of("wineA", List.of("a"), "wineB", List.of("b")),
                "attributeComparison", Map.of("attributes", List.of()));
    }
}
