package com.vinnot.ai.application.service;

import com.vinnot.ai.domain.valueobject.AiContentLanguage;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.assertj.core.api.Assertions.assertThat;

class AiProfileScoreNormalizerTest {
    @Test
    void usesCatalogScoresInBothLanguagesWithoutMutatingProviderContent() {
        Wine wine = Wine.create("Catalog wine", null, WineType.RED, null);
        wine.updateTasteProfile(40, 70, 85, 5);
        MultilingualAiContent source = source();
        var result = AiProfileScoreNormalizer.normalize(source, wine);
        for (AiContentLanguage language : AiContentLanguage.values()) {
            assertThat((Map<?, ?>) result.content(language).get("palateAnalysis"))
                    .isEqualTo(Map.of("acidityScore", 40, "tanninScore", 70, "bodyScore", 85, "sweetnessScore", 5));
            assertThat(source.content(language).get("palateAnalysis"))
                    .isEqualTo(Map.of("bodyScore", 99));
        }
        assertThat(result.enrichment()).isEqualTo(source.enrichment());
    }

    @Test
    void preservesGeneratedEstimatesWhenCatalogMeasurementsAreMissing() {
        Wine wine = Wine.create("Unknown wine", null, WineType.RED, null);
        var result = AiProfileScoreNormalizer.normalize(source(), wine);
        assertThat(((Map<?, ?>) result.content(AiContentLanguage.SPANISH).get("palateAnalysis")).get("bodyScore"))
                .isEqualTo(99);
        wine.updateTasteProfile(null, null, 50, null);
        var partial = AiProfileScoreNormalizer.normalize(source(), wine);
        assertThat(((Map<?, ?>) partial.content(AiContentLanguage.ENGLISH).get("palateAnalysis")).get("acidityScore"))
                .isNull();
        assertThat(((Map<?, ?>) partial.content(AiContentLanguage.ENGLISH).get("palateAnalysis")).get("bodyScore"))
                .isEqualTo(50);
        var withoutPalate = MultilingualAiContent.of(Map.of(
                AiContentLanguage.SPANISH, Map.of("summary", "Sin datos"),
                AiContentLanguage.ENGLISH, Map.of("summary", "No data")));
        assertThat(AiProfileScoreNormalizer.normalize(withoutPalate, wine)).isEqualTo(withoutPalate);
    }

    @Test
    void keepsAllGeneratedScoresAndNarrativeWithNoCatalogMeasurementsInBothLanguages() {
        Wine wine = Wine.create("Sparse wine", null, WineType.RED, null);
        Map<String, Object> palate = Map.of("sweetnessScore", 0, "acidityScore", 60,
                "tanninScore", 70, "bodyScore", 80, "texture", "Estimated: silky");
        Map<String, Object> profile = Map.of("summary", "Advisory analysis", "palateAnalysis", palate);
        var source = MultilingualAiContent.of(Map.of(AiContentLanguage.SPANISH, profile,
                AiContentLanguage.ENGLISH, profile));

        var result = AiProfileScoreNormalizer.normalize(source, wine);

        for (AiContentLanguage language : AiContentLanguage.values()) {
            assertThat(result.content(language)).isEqualTo(profile);
            assertThat(source.content(language)).isEqualTo(profile);
        }
    }

    private MultilingualAiContent source() {
        return new MultilingualAiContent(Map.of(
                AiContentLanguage.SPANISH, Map.of("palateAnalysis", Map.of("bodyScore", 99)),
                AiContentLanguage.ENGLISH, Map.of("palateAnalysis", Map.of("bodyScore", 99))),
                Map.of("descriptionEs", "Descripción"));
    }
}
