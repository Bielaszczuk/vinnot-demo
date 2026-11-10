package com.vinnot.ai.application.service;

import com.vinnot.ai.domain.valueobject.AiContentLanguage;
import org.junit.jupiter.api.Test;

import java.util.EnumMap;
import java.util.Map;
import java.util.HashMap;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MultilingualAiContentTest {

    @Test
    void parsesCompleteProviderPayloadAndKeepsCopiesMutable() {
        var result = MultilingualAiContent.fromProviderResponse(Map.of(
                "translations", Map.of(
                        "es", Map.of("summary", "Español"),
                        "en", Map.of("summary", "English")),
                "enrichment", Map.of("grapes", List.of("Malbec"))));

        assertThat(result).isPresent();
        MultilingualAiContent content = result.orElseThrow();
        Map<String, Object> spanish = content.content(AiContentLanguage.SPANISH);
        spanish.put("temporary", true);

        assertThat(content.content(AiContentLanguage.SPANISH))
                .containsEntry("summary", "Español")
                .doesNotContainKey("temporary");
        assertThat(content.enrichment()).containsKey("grapes");
    }

    @Test
    void rejectsMissingOrIncompleteTranslations() {
        assertThat(MultilingualAiContent.fromProviderResponse(Map.of())).isEmpty();
        assertThat(MultilingualAiContent.fromProviderResponse(Map.of(
                "translations", Map.of("es", Map.of("summary", "Solo"))))).isEmpty();
    }


    @Test
    void acceptsUnknownNullableEnrichmentWithoutInventingData() {
        Map<String, Object> enrichment = new HashMap<>();
        enrichment.put("alcoholContent", null);
        enrichment.put("imageUrl", null);
        enrichment.put("grapes", List.of("Malbec"));
        var content = MultilingualAiContent.fromProviderResponse(Map.of(
                "translations", Map.of("es", Map.of("summary", "Sin datos"),
                        "en", Map.of("summary", "No data")),
                "enrichment", enrichment)).orElseThrow();
        assertThat(content.enrichment()).containsOnlyKeys("grapes");
    }

    @Test
    void createsContentWithoutEnrichment() {
        EnumMap<AiContentLanguage, Map<String, Object>> translations =
                new EnumMap<>(AiContentLanguage.class);
        translations.put(AiContentLanguage.SPANISH, Map.of("summary", "Español"));
        translations.put(AiContentLanguage.ENGLISH, Map.of("summary", "English"));

        MultilingualAiContent content = MultilingualAiContent.of(translations);

        assertThat(content.enrichment()).isEmpty();
        assertThat(content.content(AiContentLanguage.ENGLISH))
                .containsEntry("summary", "English");
    }
}
