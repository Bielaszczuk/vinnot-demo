package com.vinnot.ai.application.service;

import com.vinnot.ai.domain.valueobject.AiContentLanguage;
import com.vinnot.ai.domain.valueobject.AiContentProvenance;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.application.port.AiCompletionService;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.PriceRange;
import com.vinnot.wine.domain.valueobject.Rating;
import com.vinnot.wine.domain.valueobject.WineType;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

class WineComparisonContentGeneratorTest {
    private final AiCompletionService provider = mock(AiCompletionService.class);
    private final WineComparisonContentGenerator generator = new WineComparisonContentGenerator(
            provider, new WineComparisonContextBuilder(mock(WineryRepositoryPort.class)),
            new WineComparisonContentValidator(), new WineComparisonAttributeNormalizer());
    private final Wine first = Wine.create("First", null, WineType.RED, UUID.randomUUID());
    private final Wine second = Wine.create("Second", null, WineType.WHITE, UUID.randomUUID());

    @Test
    void fingerprintUsesTheWineSpecificPolicyVersionAndTheFullPrompt() {
        when(provider.configurationId()).thenReturn("model-a");
        String prompt = new WineComparisonContextBuilder(mock(WineryRepositoryPort.class)).buildPrompt(first, second);

        assertThat(generator.contextFingerprint(first, second)).isEqualTo(
                AiContentProvenance.fingerprint("comparison-v10:wine-focused:model-a:" + prompt));
    }

    @Test
    void dropsTheValueNoteWhenNeitherWineHasACatalogPrice() {
        when(provider.isAvailable()).thenReturn(true);
        when(provider.chatCompletion(anyString(), eq(0.2), eq(8000))).thenReturn(responseWithValue(first, second));

        var result = generator.generate(first, second);

        for (var language : AiContentLanguage.values()) {
            assertThat(result.content(language)).containsEntry("value", null);
        }
    }

    @Test
    void keepsTheValueNoteWhenACatalogPriceExists() {
        Wine priced = Wine.builder().id(UUID.randomUUID()).name("Priced").wineType(WineType.RED)
                .priceRange(PriceRange.of(new BigDecimal("18"), new BigDecimal("22"))).build();
        when(provider.isAvailable()).thenReturn(true);
        when(provider.chatCompletion(anyString(), eq(0.2), eq(8000))).thenReturn(responseWithValue(priced, second));

        var result = generator.generate(priced, second);

        assertThat(result.content(AiContentLanguage.ENGLISH)).containsEntry("value", "Worth the price");
    }

    @Test
    @SuppressWarnings("unchecked")
    void keepsAPaidReplyWhoseOptionalFieldsCameBackBlank() {
        var spanish = WineComparisonTestData.content(first, second, AiContentLanguage.SPANISH);
        var english = WineComparisonTestData.content(first, second, AiContentLanguage.ENGLISH);
        for (var content : List.of(spanish, english)) {
            content.put("value", " ");
            ((Map<String, Object>) content.get("pairings")).put("shared", new HashMap<>(Map.of("dish", "", "why", " ")));
            ((Map<String, Object>) ((Map<String, Object>) content.get("serving")).get("wineA")).put("decanting", "");
        }
        when(provider.isAvailable()).thenReturn(true);
        when(provider.chatCompletion(anyString(), eq(0.2), eq(8000)))
                .thenReturn(Map.of("translations", Map.of("es", spanish, "en", english)));

        var result = generator.generate(first, second);

        for (var language : AiContentLanguage.values()) {
            var content = result.content(language);
            assertThat(content).containsEntry("value", null);
            assertThat((Map<String, Object>) content.get("pairings")).containsEntry("shared", null);
            assertThat((Map<String, Object>) ((Map<String, Object>) content.get("serving")).get("wineA"))
                    .containsEntry("decanting", null).containsKey("temperature");
        }
    }

    private Map<String, Object> responseWithValue(Wine wineA, Wine wineB) {
        var spanish = WineComparisonTestData.content(wineA, wineB, AiContentLanguage.SPANISH);
        var english = WineComparisonTestData.content(wineA, wineB, AiContentLanguage.ENGLISH);
        spanish.put("value", "Vale lo que cuesta");
        english.put("value", "Worth the price");
        return Map.of("translations", Map.of("es", spanish, "en", english));
    }

    @Test
    void sparsePairsStillUseTheProviderInsteadOfAnEmptyCatalogTemplate() {
        Wine sparse = Wine.create("Sparse", null, WineType.RED, UUID.randomUUID());
        when(provider.isAvailable()).thenReturn(true);
        when(provider.chatCompletion(anyString(), eq(0.2), eq(8000)))
                .thenReturn(WineComparisonTestData.response(first, sparse));
        var result = generator.generate(first, sparse);
        assertThat(result.content(AiContentLanguage.SPANISH).get("_generation"))
                .isInstanceOfSatisfying(Map.class, value -> assertThat(value.get("source")).isEqualTo("provider"));
        verify(provider).chatCompletion(anyString(), eq(0.2), eq(8000));
        verify(provider).isAvailable();
    }

    @Test
    void returnsOneValidatedBilingualProviderResponseWithoutExtraCalls() {
        when(provider.isAvailable()).thenReturn(true);
        when(provider.chatCompletion(anyString(), eq(0.2), eq(8000)))
                .thenReturn(WineComparisonTestData.response(first, second));

        var content = generator.generate(first, second);

        assertThat(content.content(AiContentLanguage.SPANISH).get("summary")).asString().contains("First", "Second");
        assertThat(content.content(AiContentLanguage.ENGLISH).get("summary")).asString().contains("First", "Second");
        verify(provider).isAvailable();
        verify(provider).chatCompletion(anyString(), eq(0.2), eq(8000));
        verify(provider).configurationId();
        verifyNoMoreInteractions(provider);
        assertThat(generator.buildDisplayName(first)).isEqualTo("First");
    }


    @Test
    void fingerprintTracksModelAndCatalogEvidence() {
        when(provider.configurationId()).thenReturn("model-a");
        String original = generator.contextFingerprint(first, second);
        assertThat(generator.contextFingerprint(first, second)).isEqualTo(original);
        second.updateDescriptions("High acidity", null);
        assertThat(generator.contextFingerprint(first, second)).isNotEqualTo(original);
    }

    @Test
    void userRatingsDoNotChangeTheComparisonFingerprint() {
        when(provider.configurationId()).thenReturn("model-a");
        Wine unrated = Wine.builder().id(UUID.randomUUID()).name("Mariflor").wineType(WineType.RED).build();
        Wine rated = Wine.builder().id(unrated.getId()).name("Mariflor").wineType(WineType.RED)
                .rating(Rating.of(new BigDecimal("5"), 2)).build();

        assertThat(generator.contextFingerprint(rated, second)).isEqualTo(generator.contextFingerprint(unrated, second));
    }

    @Test
    void unavailableProviderDoesNotProduceAFabricatedComparison() {
        assertThatThrownBy(() -> generator.generate(first, second))
                .isInstanceOf(ExternalServiceUnavailableException.class)
                .extracting("code").isEqualTo("AI_COMPARISON_UNAVAILABLE");
        verify(provider, never()).chatCompletion(anyString(), eq(0.2), eq(8000));
    }

    @Test
    void acceptsNaturalNarrativesAndNormalizesScoresInBothTranslationsWithOneCall() {
        var spanish = WineComparisonTestData.content(first, second, AiContentLanguage.SPANISH);
        var english = WineComparisonTestData.content(first, second, AiContentLanguage.ENGLISH);
        spanish.put("recommendation", "Elegí el tinto o el blanco según tu preferencia.");
        english.put("recommendation", "Choose red or white according to your preference.");
        for (var content : List.of(spanish, english)) {
            content.put("attributeComparison", Map.of("attributes", List.of(
                    Map.of("name", "Body", "wineAValue", "Not documented", "wineBValue", "Not documented",
                            "wineAScore", 70, "wineBScore", 40))));
        }
        when(provider.isAvailable()).thenReturn(true);
        when(provider.chatCompletion(anyString(), eq(0.2), eq(8000)))
                .thenReturn(Map.of("translations", Map.of("es", spanish, "en", english)));
        var result = generator.generate(first, second);
        assertThat(result.content(AiContentLanguage.SPANISH).get("recommendation"))
                .isEqualTo(spanish.get("recommendation"));
        for (var language : AiContentLanguage.values()) {
            var table = (Map<?, ?>) result.content(language).get("attributeComparison");
            var row = (Map<?, ?>) ((List<?>) table.get("attributes")).getFirst();
            assertThat(row.get("wineAScore")).isEqualTo(70);
            assertThat(row.get("wineBScore")).isEqualTo(40);
        }
        verify(provider).chatCompletion(anyString(), eq(0.2), eq(8000));
    }

    @Test
    void rejectsEmptyAndIncompleteResponsesWithoutAnAutomaticRetry() {
        when(provider.isAvailable()).thenReturn(true);
        when(provider.chatCompletion(anyString(), eq(0.2), eq(8000))).thenReturn(Map.of());
        assertThatThrownBy(() -> generator.generate(first, second))
                .isInstanceOf(ExternalServiceUnavailableException.class);
        verify(provider).chatCompletion(anyString(), eq(0.2), eq(8000));
    }

    @Test
    void rejectsCopiedPromptTextInEitherLanguageInsteadOfFallingBack() {
        var spanish = WineComparisonTestData.content(first, second, AiContentLanguage.SPANISH);
        var english = WineComparisonTestData.content(first, second, AiContentLanguage.ENGLISH);
        english.put("keyDifferences", List.of("Major structural difference"));
        when(provider.isAvailable()).thenReturn(true);
        when(provider.chatCompletion(anyString(), eq(0.2), eq(8000)))
                .thenReturn(Map.of("translations", Map.of("es", spanish, "en", english)));
        assertThatThrownBy(() -> generator.generate(first, second))
                .isInstanceOf(ExternalServiceUnavailableException.class);
        verify(provider).chatCompletion(anyString(), eq(0.2), eq(8000));
    }
}
