package com.vinnot.ai.application.service;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.TasteProfile;
import com.vinnot.wine.domain.valueobject.WineType;
import java.util.HashMap;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class WineComparisonAttributeNormalizerTest {

    private final WineComparisonAttributeNormalizer normalizer = new WineComparisonAttributeNormalizer();

    @Test
    void usesCatalogScoresByAttributeNameInsteadOfRejectingProviderEstimatesOrOrdering() {
        var first = Wine.builder()
                .id(UUID.randomUUID()).name("First")
                .wineType(WineType.RED)
                .tasteProfile(TasteProfile.of(45, 20, 0, 10)).build();
        var second = Wine.create("Second", null,
                WineType.WHITE, UUID.randomUUID());
        for (String name : List.of("Cuerpo", " BODY ", "Body")) {
            var original = content(List.of(row(name, "Full", "Unknown")));
            var result = attributes(normalizer.normalize(original, first, second)).getFirst();
            assertThat(result).containsEntry("wineAScore", 0).containsEntry("wineBScore", 65);
            assertThat(attributes(original).getFirst()).containsEntry("wineAScore", 85);
        }
        var result = attributes(normalizer.normalize(content(List.of(
                row("Acidez", "Alta", "Unknown"), row("Tannins", "Soft", "Unknown"),
                row("Complexity", "Not documented", "Unknown"))), first, second));
        assertThat(result.get(0)).containsEntry("wineAScore", 45);
        assertThat(result.get(1)).containsEntry("wineAScore", 20);
        assertThat(result.get(2)).containsEntry("wineAScore", 85);
        assertThat(normalizer.normalize(Map.of(), first, second)).isEmpty();
        assertThat(normalizer.normalize(content(List.of("legacy text")), first, second))
                .isEqualTo(content(List.of("legacy text")));
    }

    @Test
    void copiesCatalogScoresByKeyBeforeNameIncludingSweetness() {
        var first = Wine.builder().id(UUID.randomUUID()).name("First").wineType(WineType.RED)
                .tasteProfile(TasteProfile.of(45, 20, 60, 10)).build();
        var second = Wine.builder().id(UUID.randomUUID()).name("Second").wineType(WineType.WHITE)
                .tasteProfile(TasteProfile.of(80, 0, 35, 0)).build();
        var result = attributes(normalizer.normalize(content(List.of(
                keyed("body", "Structure"), keyed("tannin", "Grip"), keyed("acidity", "Freshness"),
                keyed("sweetness", "Dulzor"), keyed("alcohol", "Cuerpo"), keyed("fruitIntensity", "Body"))),
                first, second));

        assertThat(result.get(0)).containsEntry("wineAScore", 60).containsEntry("wineBScore", 35);
        assertThat(result.get(1)).containsEntry("wineAScore", 20).containsEntry("wineBScore", 0)
                .containsEntry("wineBValue", "0/100");
        assertThat(result.get(2)).containsEntry("wineAScore", 45).containsEntry("wineBScore", 80);
        assertThat(result.get(3)).containsEntry("wineAScore", 10).containsEntry("wineBScore", 0)
                .containsEntry("key", "sweetness");
        assertThat(result.get(4)).containsEntry("wineAScore", 85).containsEntry("wineBScore", 65);
        assertThat(result.get(5)).containsEntry("wineAScore", 85).containsEntry("wineBScore", 65);
    }

    @Test
    void fallsBackToTheLocalizedNameForSweetnessInLegacyRows() {
        var first = Wine.builder().id(UUID.randomUUID()).name("First").wineType(WineType.WHITE)
                .tasteProfile(TasteProfile.of(70, 0, 40, 25)).build();
        var second = Wine.create("Second", null, WineType.WHITE, UUID.randomUUID());
        for (String name : List.of("Dulzor", " sweetness ")) {
            var result = attributes(normalizer.normalize(content(List.of(row(name, "Off-dry", "Dry"))), first, second));
            assertThat(result.getFirst()).containsEntry("wineAScore", 25).containsEntry("wineBScore", 65)
                    .doesNotContainKey("key");
        }
    }

    @Test
    void normalizesLegacySixNameOnlyRowsAsBefore() {
        var first = Wine.builder().id(UUID.randomUUID()).name("First").wineType(WineType.RED)
                .tasteProfile(TasteProfile.of(45, 20, 60, 10)).build();
        var second = Wine.create("Second", null, WineType.RED, UUID.randomUUID());
        List<String> names = List.of("Cuerpo", "Taninos", "Acidez", "Intensidad Frutal", "Complejidad", "Final");
        var result = attributes(normalizer.normalize(content(names.stream()
                .map(name -> row(name, "A", "B")).toList()), first, second));

        assertThat(result).extracting(row -> row.get("name")).containsExactlyElementsOf(names);
        assertThat(result).extracting(row -> row.get("wineAScore")).containsExactly(60, 20, 45, 85, 85, 85);
        assertThat(result).allSatisfy(row -> assertThat(row).doesNotContainKey("key")
                .containsEntry("wineBScore", 65));
    }

    @Test
    void rendersKnownZeroWithoutReplacingTheGeneratedNarrativeWithNumericContrasts() {
        var first = Wine.create("Known A", null,
                WineType.RED, UUID.randomUUID());
        var second = Wine.create("Known B", null,
                WineType.WHITE, UUID.randomUUID());
        first.updateTasteProfile(55, 80, 85, 5);
        second.updateTasteProfile(85, 0, 30, 5);
        Map<String, Object> original = new HashMap<>(content(List.of(
                row("Body", "Full", "Not documented"), row("Tannins", "Firm", "No documentado"),
                row("Acidity", "Not documented", "High"))));
        original.put("keyDifferences", List.of("First has firmer structure while second is lighter and fresher."));
        var normalized = normalizer.normalize(original, first, second);
        assertThat(normalized.get("keyDifferences")).isEqualTo(original.get("keyDifferences"));
        assertThat(attributes(normalized).get(0)).containsEntry("wineBValue", "30/100");
        assertThat(attributes(normalized).get(1)).containsEntry("wineBValue", "0/100");
        assertThat(attributes(normalized).get(2)).containsEntry("wineAValue", "55/100");
        assertThat(original.get("keyDifferences")).isEqualTo(List.of("First has firmer structure while second is lighter and fresher."));
    }

    @Test
    void equalOrMissingMeasurementsPreserveQualitativeDifferencesWithoutCreatingNumericOnes() {
        var first = Wine.create("First", null,
                WineType.RED, UUID.randomUUID());
        var second = Wine.create("Second", null,
                WineType.RED, UUID.randomUUID());
        first.updateTasteProfile(50, null, 60, null);
        second.updateTasteProfile(50, 20, 60, null);
        Map<String, Object> original = new HashMap<>(content(List.of(
                row("Body", "Full", "Full"), row("Acidity", "Medium", "Medium"),
                row("Tannins", "Not documented", "Soft"), Map.of("name", 123))));
        original.put("keyDifferences", List.of("Documented qualitative contrast"));

        var normalized = normalizer.normalize(original, first, second);
        assertThat(normalized.get("keyDifferences")).isEqualTo(original.get("keyDifferences"));
        assertThat(attributes(normalized).get(0)).containsEntry("wineAScore", 60).containsEntry("wineBScore", 60);
        assertThat(attributes(normalized).get(2)).containsEntry("wineAScore", 85).containsEntry("wineBScore", 20)
                .containsEntry("wineAValue", "Not documented");
        assertThat(attributes(normalized).get(3)).doesNotContainKeys("wineAScore", "wineBScore");
        assertThat(normalizer.normalize(Map.of("attributeComparison", Map.of("attributes", "invalid")), first, second))
                .isEqualTo(Map.of("attributeComparison", Map.of("attributes", "invalid")));
    }

    @Test
    void missingDescriptorsDoNotEraseKnownScoresOrCreateANarrative() {
        var first = Wine.create("First", null,
                WineType.RED, UUID.randomUUID());
        var second = Wine.create("Second", null,
                WineType.RED, UUID.randomUUID());
        first.updateTasteProfile(null, null, 0, null);
        second.updateTasteProfile(null, null, 60, null);
        var normalized = normalizer.normalize(content(List.of(Map.of("name", "Body"), Map.of("name", "Body"))), first, second);

        assertThat(attributes(normalized).getFirst()).containsEntry("wineAScore", 0).containsEntry("wineAValue", "0/100")
                .containsEntry("wineBScore", 60).doesNotContainKey("wineBValue");
        assertThat(normalized).doesNotContainKey("keyDifferences");
    }

    @Test
    void expandsAlignedLegacyValuesWithoutInventingScoresOrMutatingCache() {
        Map<String, Object> row = row(" Cuerpo / Taninos / Acidez ",
                " Pleno / Alto / Equilibrada ", "Medio/Medio/Alta");
        Map<String, Object> content = content(List.of(row));

        List<Map<String, Object>> normalized = attributes(normalizer.normalize(content));

        assertThat(normalized).containsExactly(
                Map.of("name", "Cuerpo", "wineAValue", "Pleno", "wineBValue", "Medio"),
                Map.of("name", "Taninos", "wineAValue", "Alto", "wineBValue", "Medio"),
                Map.of("name", "Acidez", "wineAValue", "Equilibrada", "wineBValue", "Alta"));
        assertThat(attributes(content)).containsExactly(row);
        assertThat(row).containsEntry("wineAScore", 85);
        assertThat(normalizer.normalize(normalizer.normalize(content)))
                .isEqualTo(normalizer.normalize(content));
    }

    @Test
    void handlesEnglishAndDoesNotSwapWineIdentities() {
        var normalized = attributes(normalizer.normalize(content(List.of(
                row("Body/Tannins", "Full/High", "Medium/Low")))));
        assertThat(normalized.getFirst()).containsEntry("name", "Body")
                .containsEntry("wineAValue", "Full").containsEntry("wineBValue", "Medium");
    }

    @Test
    void retainsAmbiguousTextWithoutASingleMisleadingScore() {
        for (Map<String, Object> source : List.of(
                row("Body/Tannins", "Full", "Medium/Low"),
                row("Body/Tannins", "Full/High", "Medium"),
                row("Body/", "Full/High", "Medium/Low"),
                row("Body/Tannins", "Full/", "Medium/Low"),
                row("Body/Tannins", "Full/High", "/Low"),
                Map.<String, Object>of("name", "Body/Tannins"))) {
            var normalized = attributes(normalizer.normalize(content(List.of(source))));
            assertThat(normalized).hasSize(1);
            assertThat(normalized.getFirst()).containsEntry("name", source.get("name"))
                    .doesNotContainKeys("wineAScore", "wineBScore");
            source.forEach((key, value) -> {
                if (!key.endsWith("Score")) {
                    assertThat(normalized.getFirst()).containsEntry(key, value);
                }
            });
        }
    }

    @Test
    void leavesIndividualAttributesAndTheirScoresUnchanged() {
        var content = content(List.of(row("Body", "Full/rounded", "Medium")));
        assertThat(normalizer.normalize(content)).isEqualTo(content);
    }

    @Test
    void toleratesAbsentAndNonStructuredSections() {
        for (var content : List.of(Map.<String, Object>of(),
                Map.<String, Object>of("attributeComparison", "text"),
                Map.<String, Object>of("attributeComparison", Map.of()),
                Map.<String, Object>of("attributeComparison", Map.of("attributes", "text")))) {
            assertThat(normalizer.normalize(content)).isSameAs(content);
        }
        var content = content(List.of("legacy text", Map.of("wineAValue", "value")));
        assertThat(normalizer.normalize(content)).isEqualTo(content);
    }

    private Map<String, Object> row(String name, String first, String second) {
        return Map.of("name", name, "wineAValue", first, "wineBValue", second,
                "wineAScore", 85, "wineBScore", 65);
    }

    private Map<String, Object> keyed(String key, String name) {
        Map<String, Object> row = new HashMap<>(row(name, "Value A", "Value B"));
        row.put("key", key);
        return row;
    }

    private Map<String, Object> content(List<?> rows) {
        return Map.of("summary", "Preserved", "attributeComparison",
                Map.of("attributes", rows, "metadata", "Preserved"));
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> attributes(Map<String, Object> content) {
        return (List<Map<String, Object>>) ((Map<?, ?>) content.get("attributeComparison")).get("attributes");
    }
}
