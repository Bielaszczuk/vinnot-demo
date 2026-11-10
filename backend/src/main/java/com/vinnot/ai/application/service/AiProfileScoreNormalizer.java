package com.vinnot.ai.application.service;

import com.vinnot.ai.domain.valueobject.AiContentLanguage;
import com.vinnot.wine.domain.model.Wine;
import java.util.EnumMap;
import java.util.Map;
import java.util.Objects;

/** Keeps catalog measurements authoritative without discarding generated profile estimates. */
final class AiProfileScoreNormalizer {
    private AiProfileScoreNormalizer() {
    }

    static MultilingualAiContent normalize(MultilingualAiContent content, Wine wine) {
        Map<AiContentLanguage, Map<String, Object>> translations = new EnumMap<>(AiContentLanguage.class);
        var taste = wine.getTasteProfile();
        for (AiContentLanguage language : AiContentLanguage.values()) {
            Map<String, Object> profile = content.content(language);
            if (profile.get("palateAnalysis") instanceof Map<?, ?> rawPalate) {
                Map<String, Object> palate = MultilingualAiContent.toStringKeyMap(rawPalate);
                preferCatalogScore(palate, "sweetnessScore", Objects.isNull(taste) ? null : taste.getSweetness());
                preferCatalogScore(palate, "acidityScore", Objects.isNull(taste) ? null : taste.getAcidity());
                preferCatalogScore(palate, "tanninScore", Objects.isNull(taste) ? null : taste.getTannin());
                preferCatalogScore(palate, "bodyScore", Objects.isNull(taste) ? null : taste.getBody());
                profile.put("palateAnalysis", palate);
            }
            translations.put(language, profile);
        }
        return new MultilingualAiContent(translations, content.enrichment());
    }

    private static void preferCatalogScore(Map<String, Object> palate, String key, Integer knownScore) {
        if (Objects.nonNull(knownScore)) {
            palate.put(key, knownScore);
        }
    }
}
