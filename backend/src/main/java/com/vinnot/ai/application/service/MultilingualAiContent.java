package com.vinnot.ai.application.service;

import com.vinnot.ai.domain.valueobject.AiContentLanguage;

import java.util.EnumMap;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/** Parsed multilingual payload returned by an AI provider. */
record MultilingualAiContent(
        Map<AiContentLanguage, Map<String, Object>> translations,
        Map<String, Object> enrichment) {

    private static final String TRANSLATIONS_KEY = "translations";
    private static final String ENRICHMENT_KEY = "enrichment";

    MultilingualAiContent {
        EnumMap<AiContentLanguage, Map<String, Object>> safeTranslations =
                new EnumMap<>(AiContentLanguage.class);
        translations.forEach((language, content) ->
                safeTranslations.put(language, new HashMap<>(content)));
        translations = Map.copyOf(safeTranslations);
        // Unknown provider fields may legitimately be JSON null. They are not enrichment.
        Map<String, Object> knownEnrichment = new HashMap<>();
        if (Objects.nonNull(enrichment)) {
            enrichment.forEach((key, value) -> {
                if (Objects.nonNull(key) && Objects.nonNull(value)) {
                    knownEnrichment.put(key, value);
                }
            });
        }
        enrichment = Map.copyOf(knownEnrichment);
    }

    Map<String, Object> content(AiContentLanguage language) {
        return new HashMap<>(translations.get(language));
    }

    static MultilingualAiContent of(
            Map<AiContentLanguage, Map<String, Object>> translations) {
        return new MultilingualAiContent(translations, Map.of());
    }

    /** Requires every configured language so incomplete provider responses are never persisted. */
    static Optional<MultilingualAiContent> fromProviderResponse(Map<String, Object> response) {
        Object rawTranslations = response.get(TRANSLATIONS_KEY);
        if (!(rawTranslations instanceof Map<?, ?> translationMap)) {
            return Optional.empty();
        }

        EnumMap<AiContentLanguage, Map<String, Object>> parsed =
                new EnumMap<>(AiContentLanguage.class);
        for (AiContentLanguage language : AiContentLanguage.values()) {
            Object rawContent = translationMap.get(language.code());
            if (!(rawContent instanceof Map<?, ?> contentMap)) {
                return Optional.empty();
            }
            parsed.put(language, toStringKeyMap(contentMap));
        }

        Map<String, Object> enrichment = Map.of();
        Object rawEnrichment = response.get(ENRICHMENT_KEY);
        if (rawEnrichment instanceof Map<?, ?> enrichmentMap) {
            enrichment = toStringKeyMap(enrichmentMap);
        }
        return Optional.of(new MultilingualAiContent(parsed, enrichment));
    }

    static Map<String, Object> toStringKeyMap(Map<?, ?> source) {
        Map<String, Object> result = new HashMap<>();
        source.forEach((key, value) -> {
            if (Objects.nonNull(key)) {
                result.put(key.toString(), value);
            }
        });
        return result;
    }
}
