package com.vinnot.ai.application.service;

import com.vinnot.ai.domain.valueobject.AiContentLanguage;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;

class WineComparisonContentValidatorTest {
    private final WineComparisonContentValidator validator = new WineComparisonContentValidator();
    private final Wine first = Wine.create("Primero", null, WineType.RED, UUID.randomUUID());
    private final Wine second = Wine.create("Segundo", null, WineType.WHITE, UUID.randomUUID());

    @Test
    void acceptsHonestLimitedEvidenceWithEmptyListsAndUnknownScores() {
        assertThat(validator.isValid(WineComparisonTestData.bundle(first, second))).isTrue();
        assertThat(validator.isReusable(content())).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"Diferencia estructural principal", "Diferencia en el perfil de sabor",
        "Diferencia de terroir o estilo", "Major structural difference", "Flavor profile distinction",
        "Terroir or style difference", "  DIFERENCIA ESTRUCTURAL PRINCIPAL.  "})
    void rejectsHistoricalPromptLiteralsRegardlessOfCaseOrPunctuation(String placeholder) {
        Map<String, Object> content = content();
        content.put("keyDifferences", List.of(placeholder));
        assertThat(validator.isReusable(content)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"summary", "recommendation", "recommendationWineA", "recommendationWineB",
        "keyDifferences", "similarities", "bestFor", "attributeComparison"})
    void rejectsMissingRequiredSections(String field) {
        var content = content();
        content.remove(field);
        assertThat(validator.isReusable(content)).isFalse();
    }

    @Test
    void rejectsInvalidTextAndListTypesWithoutThrowing() {
        assertThat(validator.isReusable(null)).isFalse();
        for (Object value : List.of("", " ", 42, "a".repeat(2001))) {
            var content = content();
            content.put("summary", value);
            assertThat(validator.isReusable(content)).isFalse();
        }
        for (Object value : List.of("not a list", List.of(1),
                List.of("a", "b", "c", "d", "e", "f", "g"))) {
            var content = content();
            content.put("similarities", value);
            assertThat(validator.isReusable(content)).isFalse();
        }
    }

    @Test
    void rejectsMalformedBestForAndAttributes() {
        var content = content();
        content.put("bestFor", Map.of("wineA", List.of(), "wineB", "invalid"));
        assertThat(validator.isReusable(content)).isFalse();
        for (Object value : List.of("invalid", Map.of(), Map.of("attributes", "invalid"),
                Map.of("attributes", List.of()), Map.of("attributes", List.of("invalid")),
                Map.of("attributes", List.of(Map.of("name", "Body"))))) {
            content = content();
            content.put("attributeComparison", value);
            assertThat(validator.isReusable(content)).isFalse();
        }
    }

    @Test
    void rejectsMalformedScoresButPreservesValidLegacyNumbers() {
        for (Object invalid : List.of(-1, 101, Double.NaN, Double.POSITIVE_INFINITY, "70")) {
            var content = content();
            rows(content).getFirst().put("wineAScore", invalid);
            assertThat(validator.isReusable(content)).isFalse();
        }
        var content = content();
        rows(content).getFirst().put("wineAScore", 0);
        rows(content).getFirst().put("wineBScore", 100);
        assertThat(validator.isReusable(content)).isTrue();
    }

    @Test
    void rejectsGenericHistoricalFallbackInBothLanguages() {
        for (String summary : List.of("Comparación profesional entre Primero y Segundo. El primero destaca por su estructura y complejidad.",
                "Professional comparison between Primero and Segundo. The first stands out for structure and complexity.")) {
            var content = content();
            content.put("summary", summary);
            assertThat(validator.isReusable(content)).isFalse();
        }
    }

    @Test
    void preservesRealLegacyNarrativesEvenWhenTheyStartLikeTheOldFallback() {
        var content = content();
        content.put("summary", "Comparación profesional entre Primero y Segundo: el primero es tinto y el segundo blanco.");
        assertThat(validator.isReusable(content)).isTrue();
    }

    @Test
    void acceptsEditorialVariationsWithoutTurningThemIntoServiceFailures() {
        var content = content();
        content.put("summary", "Un tinto y un blanco con información sensorial limitada.");
        content.put("recommendation", "Elegí según el tipo de vino que buscás; no hay base para un ganador.");
        content.put("recommendationWineA", "El tinto para quien prefiere este estilo.");
        content.put("recommendationWineB", "El blanco como alternativa.");
        content.put("keyDifferences", List.of("uno", "dos", "tres", "cuatro"));
        content.put("bestFor", Map.of("wineA", List.of("a", "b", "c"), "wineB", List.of()));
        assertThat(validator.isValid(bundle(content))).isTrue();
        content.put("recommendation", content.get("summary"));
        content.put("similarities", List.of("Duplicado", "duplicado."));
        assertThat(validator.isValid(bundle(content))).isTrue();
    }

    @Test
    void acceptsRenderableAttributeCountsAndNamesWithoutExactOrdering() {
        var content = content();
        rows(content).removeLast();
        rows(content).getFirst().put("name", "Body/Tannins");
        Collections.reverse(rows(content));
        assertThat(validator.isValid(bundle(content))).isTrue();
    }

    @Test
    void stillRejectsMalformedContentInEitherLanguage() {
        var bundle = WineComparisonTestData.bundle(first, second);
        bundle.translations().get(AiContentLanguage.ENGLISH).put("summary", "");
        assertThat(validator.isValid(bundle)).isFalse();
    }

    @Test
    void acceptsTheEightAxesAndRejectsMoreRows() {
        var content = content();
        assertThat(rows(content)).hasSize(8);
        assertThat(validator.isReusable(content)).isTrue();
        rows(content).add(new HashMap<>(rows(content).getFirst()));
        assertThat(validator.isReusable(content)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"tastingNotes", "chooseIf", "pairings", "serving", "aging"})
    void rejectsContentMissingAnAdditiveSectionSoItRegenerates(String field) {
        var content = content();
        content.remove(field);
        assertThat(validator.isReusable(content)).isFalse();
    }

    @Test
    @SuppressWarnings("unchecked")
    void rejectsMalformedAdditiveSections() {
        List<Consumer<Map<String, Object>>> corruptions = List.of(
                content -> section(content, "tastingNotes").put("wineB", "text"),
                content -> ((Map<String, Object>) section(content, "tastingNotes").get("wineA")).remove("nose"),
                content -> ((Map<String, Object>) section(content, "tastingNotes").get("wineA")).put("palate", " "),
                content -> content.put("chooseIf", "text"),
                content -> content.put("chooseIf", List.of(WineComparisonTestData.choice("C", "Other"))),
                content -> content.put("chooseIf", List.of(Map.of("pick", "A", "situation", "Lunch"))),
                content -> content.put("chooseIf", Collections.nCopies(7, WineComparisonTestData.choice("A", "Many"))),
                content -> section(content, "pairings").put("wineB", "text"),
                content -> section(content, "pairings").put("wineA", List.of(Map.of("dish", "Only a dish"))),
                content -> section(content, "pairings").put("shared", "text"),
                content -> section(content, "pairings").remove("wineA"),
                content -> ((Map<String, Object>) section(content, "serving").get("wineA")).put("decanting", " "),
                content -> section(content, "serving").put("wineB", "16 °C"),
                content -> section(content, "aging").put("wineB", ""),
                content -> section(content, "aging").remove("wineA"),
                content -> content.put("value", 42),
                content -> content.put("value", " "));
        for (var corruption : corruptions) {
            var content = content();
            corruption.accept(content);
            assertThat(validator.isReusable(content)).isFalse();
        }
    }

    @Test
    void acceptsASharedPairingAndAValueNoteOrTheirAbsence() {
        var content = content();
        section(content, "pairings").put("shared", WineComparisonTestData.pairing("Hongos al ajillo"));
        content.put("value", "El primero cuesta el doble y lo justifica con más guarda.");
        assertThat(validator.isReusable(content)).isTrue();
        content.remove("value");
        section(content, "pairings").remove("shared");
        assertThat(validator.isReusable(content)).isTrue();
    }

    @Test
    @SuppressWarnings("unchecked")
    void acceptsAServingWithoutDecantingAdvice() {
        var content = content();
        ((Map<String, Object>) section(content, "serving").get("wineA")).put("decanting", null);
        assertThat(validator.isReusable(content)).isTrue();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> section(Map<String, Object> content, String key) {
        return (Map<String, Object>) content.get(key);
    }

    private Map<String, Object> content() {
        return WineComparisonTestData.content(first, second, AiContentLanguage.SPANISH);
    }

    private MultilingualAiContent bundle(Map<String, Object> spanish) {
        return MultilingualAiContent.of(Map.of(AiContentLanguage.SPANISH, spanish,
                AiContentLanguage.ENGLISH, WineComparisonTestData.content(first, second, AiContentLanguage.ENGLISH)));
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> rows(Map<String, Object> content) {
        return (List<Map<String, Object>>) ((Map<?, ?>) content.get("attributeComparison")).get("attributes");
    }
}
