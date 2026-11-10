package com.vinnot.ai.application.service;

import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.util.Map;
import java.util.UUID;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MockAiProfileGeneratorTest {

    private final MockAiProfileGenerator generator = new MockAiProfileGenerator();

    @Test
    void generatesLanguageAndWineTypeSpecificProfiles() {
        Wine red = wine("Reserva", WineType.RED);
        Wine white = wine("Blanc", WineType.WHITE);

        Map<String, Object> spanish = generator.generateMockProfile(red, "es-AR", false);
        Map<String, Object> english = generator.generateMockProfile(white, "en-US", false);

        assertThat(spanish.get("summary").toString())
                .contains("Reserva", "tinto robusto");
        assertThat(english.get("summary").toString())
                .contains("Blanc", "fresh white");
        assertThat(spanish).containsKeys(
                "visualAnalysis", "aromaticProfile", "palateAnalysis",
                "flavorProfile", "foodPairings", "servingRecommendations");
        assertThat(spanish).doesNotContainKey("enrichment");
    }

    @Test
    @SuppressWarnings("unchecked")
    void proposesOnlyMissingEnrichmentFields() {
        Wine wine = wine("Reserva", WineType.RED);
        wine.updateGrapes(List.of("Malbec"));

        Map<String, Object> result = generator.generateMockProfile(wine, "es", true);
        Map<String, Object> enrichment =
                (Map<String, Object>) result.get("enrichment");

        assertThat(enrichment)
                .doesNotContainKey("grapes")
                .containsKeys("allergens", "descriptionEs", "descriptionEn",
                        "alcoholContent", "servingTempMin", "servingTempMax",
                        "foodPairing");
    }

    @ParameterizedTest
    @EnumSource(WineType.class)
    void generatesEverySupportedTypeInBothLanguages(WineType type) {
        Wine wine = wine(type.name(), type);

        Map<String, Object> spanish = generator.generateMockProfile(wine, "es", true);
        Map<String, Object> english = generator.generateMockProfile(wine, "en", true);

        assertThat(spanish).containsKeys("summary", "visualAnalysis", "aromaticProfile",
                "palateAnalysis", "flavorProfile", "foodPairings",
                "servingRecommendations", "enrichment");
        assertThat(english).containsKeys("summary", "visualAnalysis", "aromaticProfile",
                "palateAnalysis", "flavorProfile", "foodPairings",
                "servingRecommendations", "enrichment");
    }

    private Wine wine(String name, WineType type) {
        return Wine.create(name, UUID.randomUUID(), type, UUID.randomUUID());
    }
}
