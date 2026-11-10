package com.vinnot.ai.application.service;

import com.vinnot.ai.domain.valueobject.AiContentLanguage;
import com.vinnot.ai.domain.valueobject.AiContentProvenance;
import com.vinnot.shared.application.port.AiCompletionService;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.wine.domain.model.Wine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.EnumMap;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/** Generates and validates one bilingual response without fabricating a fallback comparison. */
@Service
public class WineComparisonContentGenerator {

    private static final Logger LOG = LoggerFactory.getLogger(
            WineComparisonContentGenerator.class);
    private static final double PROVIDER_TEMPERATURE = 0.2;
    // Fits the bilingual wine-specific document (tasting notes, pairings, serving, aging) without truncation.
    private static final int PROVIDER_MAX_TOKENS = 8000;
    private static final String POLICY_VERSION = "comparison-v10:wine-focused:";

    private final AiCompletionService completionService;
    private final WineComparisonContextBuilder contextBuilder;
    private final WineComparisonContentValidator contentValidator;
    private final WineComparisonAttributeNormalizer attributeNormalizer;

    public WineComparisonContentGenerator(
            AiCompletionService completionService,
            WineComparisonContextBuilder contextBuilder,
            WineComparisonContentValidator contentValidator,
            WineComparisonAttributeNormalizer attributeNormalizer) {
        this.completionService = completionService;
        this.contextBuilder = contextBuilder;
        this.contentValidator = contentValidator;
        this.attributeNormalizer = attributeNormalizer;
    }

    public MultilingualAiContent generate(Wine wineA, Wine wineB) {
        if (!completionService.isAvailable()) {
            LOG.warn("Comparison provider unavailable for wines: {} and {}",
                    wineA.getId(), wineB.getId());
            throw unavailable();
        }

        LOG.info("Calling AI provider for wine comparison: {} vs {}",
                wineA.getId(), wineB.getId());
        String prompt = contextBuilder.buildPrompt(wineA, wineB);
        String fingerprint = AiContentProvenance.fingerprint(POLICY_VERSION + completionService.configurationId() + ":" + prompt);
        Map<String, Object> result = completionService.chatCompletion(
                prompt,
                PROVIDER_TEMPERATURE,
                PROVIDER_MAX_TOKENS);
        Optional<MultilingualAiContent> content =
                MultilingualAiContent.fromProviderResponse(result)
                        .map(this::clearBlankOptionals)
                        .filter(contentValidator::isValid)
                        .map(bundle -> normalizeAttributes(bundle, wineA, wineB, fingerprint, "provider"));
        if (content.isEmpty()) {
            LOG.warn("Rejected incomplete or invalid multilingual comparison: {} vs {}",
                    wineA.getId(), wineB.getId());
        }
        return content.orElseThrow(this::unavailable);
    }

    /** Optional fields left blank by the provider mean "nothing to add", not a broken paid reply. */
    private MultilingualAiContent clearBlankOptionals(MultilingualAiContent bundle) {
        EnumMap<AiContentLanguage, Map<String, Object>> translations = new EnumMap<>(AiContentLanguage.class);
        for (AiContentLanguage language : AiContentLanguage.values()) {
            Map<String, Object> content = bundle.content(language);
            if (blank(content.get("value"))) {
                content.put("value", null);
            }
            if (content.get("pairings") instanceof Map<?, ?> pairings
                    && pairings.get("shared") instanceof Map<?, ?> shared
                    && blank(shared.get("dish")) && blank(shared.get("why"))) {
                Map<Object, Object> cleared = new HashMap<>(pairings);
                cleared.put("shared", null);
                content.put("pairings", cleared);
            }
            if (content.get("serving") instanceof Map<?, ?> serving) {
                Map<Object, Object> cleared = new HashMap<>(serving);
                serving.forEach((side, advice) -> {
                    if (advice instanceof Map<?, ?> fields && blank(fields.get("decanting"))) {
                        Map<Object, Object> withoutDecanting = new HashMap<>(fields);
                        withoutDecanting.put("decanting", null);
                        cleared.put(side, withoutDecanting);
                    }
                });
                content.put("serving", cleared);
            }
            translations.put(language, content);
        }
        return new MultilingualAiContent(translations, bundle.enrichment());
    }

    private static boolean blank(Object value) {
        return value instanceof String text && text.isBlank();
    }

    private MultilingualAiContent normalizeAttributes(MultilingualAiContent bundle, Wine wineA, Wine wineB, String fingerprint, String source) {
        boolean priced = WineCatalogFacts.hasCatalogPrice(wineA) || WineCatalogFacts.hasCatalogPrice(wineB);
        EnumMap<AiContentLanguage, Map<String, Object>> translations = new EnumMap<>(AiContentLanguage.class);
        for (AiContentLanguage language : AiContentLanguage.values()) {
            Map<String, Object> normalized = new HashMap<>(
                    attributeNormalizer.normalize(bundle.content(language), wineA, wineB));
            if (!priced) {
                // A value note without any catalog price would be invented.
                normalized.put("value", null);
            }
            translations.put(language, AiContentProvenance.stamp(normalized, source, fingerprint));
        }
        return MultilingualAiContent.of(translations);
    }

    private ExternalServiceUnavailableException unavailable() {
        return new ExternalServiceUnavailableException("AI_COMPARISON_UNAVAILABLE",
                "A reliable wine comparison could not be generated. Please try again later.", null);
    }

    public String contextFingerprint(Wine wineA, Wine wineB) {
        return AiContentProvenance.fingerprint(POLICY_VERSION + completionService.configurationId() + ":" + contextBuilder.buildPrompt(wineA, wineB));
    }

    public String buildDisplayName(Wine wine) {
        return contextBuilder.buildDisplayName(wine);
    }
}
