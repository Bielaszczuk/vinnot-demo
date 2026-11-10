package com.vinnot.ai.application.service;

import com.vinnot.ai.domain.valueobject.AiContentLanguage;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class WineComparisonPromptLocaleTest {

    private static final List<String> KEYS = List.of(
            "body", "tannin", "acidity", "sweetness", "alcohol", "fruitIntensity", "complexity", "finish");

    @Test
    void exposesEightKeyedAttributesInTheFixedOrderForEachLanguage() throws Exception {
        assertSchema(AiContentLanguage.SPANISH, "Cuerpo", "Taninos", "Acidez", "Dulzor", "Alcohol",
                "Intensidad Frutal", "Complejidad", "Final");
        assertSchema(AiContentLanguage.ENGLISH, "Body", "Tannins", "Acidity", "Sweetness", "Alcohol",
                "Fruit Intensity", "Complexity", "Finish");
    }

    @Test
    void declaresEveryAdditiveSectionWithoutSampleNarrative() throws Exception {
        for (AiContentLanguage language : AiContentLanguage.values()) {
            JsonNode schema = schema(language);
            for (String side : List.of("wineA", "wineB")) {
                for (String field : List.of("identity", "appearance", "nose", "palate", "finish")) {
                    assertThat(schema.path("tastingNotes").path(side).path(field).isTextual()).isTrue();
                    assertThat(schema.path("tastingNotes").path(side).path(field).asText()).isEmpty();
                }
                assertThat(schema.path("pairings").path(side).isArray()).isTrue();
                assertThat(schema.path("pairings").path(side).get(0).has("dish")).isTrue();
                assertThat(schema.path("pairings").path(side).get(0).has("why")).isTrue();
                assertThat(schema.path("serving").path(side).has("temperature")).isTrue();
                assertThat(schema.path("serving").path(side).has("decanting")).isTrue();
                assertThat(schema.path("aging").path(side).isTextual()).isTrue();
            }
            assertThat(schema.path("pairings").path("shared").has("dish")).isTrue();
            assertThat(schema.path("chooseIf").isArray()).isTrue();
            assertThat(schema.path("chooseIf").get(0).path("pick").asText()).isEqualTo("A");
            assertThat(schema.path("chooseIf").get(1).path("pick").asText()).isEqualTo("B");
            assertThat(schema.path("chooseIf").get(0).path("situation").asText()).isEmpty();
            assertThat(schema.has("value")).isTrue();
            assertThat(schema.path("value").isNull()).isTrue();
            assertThat(schema.has("summary")).isTrue();
            assertThat(schema.has("bestFor")).isTrue();
        }
    }

    private void assertSchema(AiContentLanguage language, String... names) throws Exception {
        var attributes = schema(language).path("attributeComparison").path("attributes");
        assertThat(attributes.size()).isEqualTo(names.length);
        assertThat(WineComparisonPromptLocale.from(language).attributes())
                .extracting(WineComparisonPromptLocale.Attribute::key).containsExactlyElementsOf(KEYS);
        for (int index = 0; index < names.length; index++) {
            var attribute = attributes.get(index);
            assertThat(attribute.path("key").asText()).isEqualTo(KEYS.get(index));
            assertThat(attribute.path("name").asText()).isEqualTo(names[index]);
            assertThat(attribute.path("wineAValue").isTextual()).isTrue();
            assertThat(attribute.path("wineBValue").isTextual()).isTrue();
            assertThat(attribute.path("wineAScore").isNull()).isTrue();
            assertThat(attribute.path("wineBScore").isNull()).isTrue();
        }
    }

    private JsonNode schema(AiContentLanguage language) throws Exception {
        return new ObjectMapper().readTree(WineComparisonPromptLocale.from(language).comparisonSchema());
    }
}
