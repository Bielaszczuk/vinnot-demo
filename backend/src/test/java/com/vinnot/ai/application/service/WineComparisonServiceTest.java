package com.vinnot.ai.application.service;

import com.vinnot.ai.application.dto.WineComparisonResponse;
import com.vinnot.ai.domain.model.WineComparison;
import com.vinnot.ai.domain.repository.WineComparisonRepository;
import com.vinnot.ai.domain.valueobject.AiContentLanguage;
import com.vinnot.ai.domain.valueobject.CanonicalWinePair;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;
import com.vinnot.ai.domain.valueobject.AiContentProvenance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;

class WineComparisonServiceTest {
    private final WineComparisonRepository comparisons = mock(WineComparisonRepository.class);
    private final WineRepositoryPort wines = mock(WineRepositoryPort.class);
    private final WineComparisonContentGenerator generator = mock(WineComparisonContentGenerator.class);
    private final AiGenerationCoordinator coordinator = mock(AiGenerationCoordinator.class);
    private final WineComparisonService service = new WineComparisonService(
            comparisons, wines, generator, new WineComparisonContentOrienter(),
            new WineComparisonAttributeNormalizer(), new WineComparisonContentValidator(), coordinator);
    private final Wine first = Wine.create("Reserva A", null, WineType.RED, UUID.randomUUID());
    private final Wine second = Wine.create("Reserva B", null, WineType.WHITE, UUID.randomUUID());
    private final CanonicalWinePair pair = CanonicalWinePair.of(first.getId(), second.getId());

    @BeforeEach
    void setUp() {
        when(generator.contextFingerprint(any(), any())).thenReturn("test-context");
        when(wines.findById(first.getId())).thenReturn(Optional.of(first));
        when(wines.findById(second.getId())).thenReturn(Optional.of(second));
        when(generator.buildDisplayName(any())).thenAnswer(call -> ((Wine) call.getArgument(0)).getName());
        when(generator.generate(any(), any())).thenAnswer(call -> WineComparisonTestData.bundle(
                call.getArgument(0), call.getArgument(1)));
        when(comparisons.saveBundle(any())).thenAnswer(call -> call.getArgument(0));
        when(coordinator.execute(any(), any(), any())).thenAnswer(call -> {
            Supplier<Optional<Object>> completed = call.getArgument(1);
            Supplier<Object> generation = call.getArgument(2);
            return completed.get().orElseGet(generation);
        });
    }

    @Test
    void rejectsSelfComparisonBeforeRepositoryAccess() {
        assertThatThrownBy(() -> service.compare(first.getId(), first.getId(), "es"))
                .isInstanceOf(BusinessRuleViolationException.class);
        verifyNoInteractions(comparisons, wines, coordinator);
    }

    @Test
    void rejectsMissingFirstOrSecondWine() {
        UUID missing = UUID.randomUUID();
        assertThatThrownBy(() -> service.compare(missing, second.getId(), "es"))
                .isInstanceOf(EntityNotFoundException.class);
        assertThatThrownBy(() -> service.compare(first.getId(), missing, "es"))
                .isInstanceOf(EntityNotFoundException.class);
        verifyNoInteractions(comparisons, coordinator);
    }

    @Test
    void returnsValidCacheInEitherLanguageWithoutGenerationOrWrites() {
        cache(AiContentLanguage.SPANISH);
        cache(AiContentLanguage.ENGLISH);

        for (String language : List.of("es-AR", "en-US")) {
            var response = service.compare(first.getId(), second.getId(), language);
            assertThat(response.cached()).isTrue();
            assertThat(response.wineAId()).isEqualTo(first.getId());
            assertThat(response.wineBId()).isEqualTo(second.getId());
            assertThat(response.recommendationWineA()).contains(first.getName());
        }
        verify(generator, never()).generate(any(), any());
        verify(comparisons, never()).saveBundle(any());
        verify(comparisons, never()).existsByWineIdsAndLanguage(any(), any(), anyString());
    }

    @Test
    void missingTranslationRegeneratesAndAtomicallySavesBothLanguages() {
        cache(AiContentLanguage.SPANISH);
        assertGeneratedBundle();
    }

    @Test
    void missingCacheGeneratesBothLanguagesOnce() {
        assertGeneratedBundle();
    }

    @Test
    void spanishPlaceholderRegeneratesOnlyTheRequestedPair() {
        var spanish = cache(AiContentLanguage.SPANISH);
        cache(AiContentLanguage.ENGLISH);
        spanish.getComparisonJson().put("keyDifferences", List.of(
                "Diferencia estructural principal", "Diferencia en el perfil de sabor", "Diferencia de terroir o estilo"));
        assertGeneratedBundle();
        verify(comparisons, never()).deleteByWineIdsAndLanguage(any(), any(), anyString());
    }

    @Test
    void invalidUnrequestedEnglishTranslationAlsoInvalidatesTheBundle() {
        cache(AiContentLanguage.SPANISH);
        cache(AiContentLanguage.ENGLISH).getComparisonJson()
                .put("keyDifferences", List.of("Major structural difference"));
        assertGeneratedBundle();
    }

    @Test
    void cachedRowWithoutTheWineSpecificSectionsRegenerates() {
        cache(AiContentLanguage.SPANISH);
        var english = cache(AiContentLanguage.ENGLISH).getComparisonJson();
        english.remove("tastingNotes");
        english.remove("chooseIf");
        assertGeneratedBundle();
    }

    @Test
    void reversedRequestReorientsTheWineSpecificSections() {
        cache(AiContentLanguage.SPANISH);
        cache(AiContentLanguage.ENGLISH);

        var response = service.compare(pair.wineBId(), pair.wineAId(), "en");

        assertThat(response.cached()).isTrue();
        assertThat(response.tastingNotes().wineA().identity()).isEqualTo(canonicalB().getName() + " identity");
        assertThat(response.chooseIf()).extracting(WineComparisonResponse.ChooseIf::pick).containsExactly("B", "A");
        assertThat(response.pairings().wineA()).extracting(WineComparisonResponse.Pairing::dish)
                .containsExactly("Dish for " + canonicalB().getName());
        assertThat(response.aging().wineB()).isEqualTo(canonicalA().getName() + " window");
        assertThat(response.serving().wineA().temperature()).isEqualTo("8-10 °C");
        verify(generator, never()).generate(any(), any());
    }

    @Test
    void oldFabricatedFallbackIsNotReused() {
        cache(AiContentLanguage.SPANISH).getComparisonJson()
                .put("summary", "Comparación profesional entre A y B. El primero destaca por su estructura y complejidad.");
        cache(AiContentLanguage.ENGLISH);
        assertGeneratedBundle();
    }

    @Test
    void generationFailureDoesNotOverwriteOrDeleteCachedRows() {
        cache(AiContentLanguage.SPANISH).getComparisonJson()
                .put("keyDifferences", List.of("Diferencia estructural principal"));
        doThrow(
                new ExternalServiceUnavailableException("AI_COMPARISON_UNAVAILABLE", "Unavailable", null))
                .when(generator).generate(any(), any());
        assertThatThrownBy(() -> service.compare(first.getId(), second.getId(), "es"))
                .isInstanceOf(ExternalServiceUnavailableException.class);
        verify(comparisons, never()).saveBundle(any());
        verify(comparisons, never()).deleteByWineIdsAndLanguage(any(), any(), anyString());
    }

    @Test
    void reorientsAndNormalizesUsableLegacyAttributesWithoutRegenerating() {
        var spanish = cache(AiContentLanguage.SPANISH);
        cache(AiContentLanguage.ENGLISH);
        spanish.getComparisonJson().put("attributeComparison", Map.of("attributes", List.of(Map.of(
                "name", "Cuerpo/Taninos", "wineAValue", "Pleno/Alto",
                "wineBValue", "Medio/Bajo", "wineAScore", 85, "wineBScore", 65))));
        var response = service.compare(pair.wineBId(), pair.wineAId(), "es");

        assertThat(response.cached()).isTrue();
        assertThat(response.attributeComparison().get("attributes")).isEqualTo(List.of(
                Map.of("name", "Cuerpo", "wineAValue", "Medio", "wineBValue", "Pleno"),
                Map.of("name", "Taninos", "wineAValue", "Bajo", "wineBValue", "Alto")));
        assertThat(response.recommendationWineA()).contains(canonicalB().getName());
        assertThat(((Map<?, ?>) spanish.getComparisonJson().get("attributeComparison")).get("attributes"))
                .asList().hasSize(1);
        verify(generator, never()).generate(any(), any());
    }

    @Test
    void concurrentAndLanguageSwitchedRequestsShareTheCanonicalLeaseKey() {
        cache(AiContentLanguage.SPANISH);
        cache(AiContentLanguage.ENGLISH);
        service.compare(first.getId(), second.getId(), "es");
        service.compare(second.getId(), first.getId(), "en");
        verify(coordinator, times(2)).execute(
                eq("wine-comparison:" + pair.wineAId() + ":" + pair.wineBId()),
                any(), any());
    }

    private WineComparison cache(AiContentLanguage language) {
        var cached = WineComparison.create(pair.wineAId(), pair.wineBId(), language.code(),
                AiContentProvenance.stamp(
                        WineComparisonTestData.content(canonicalA(), canonicalB(), language), "provider", "test-context"));
        when(comparisons.findByWineIdsAndLanguage(pair.wineAId(), pair.wineBId(), language.code()))
                .thenReturn(Optional.of(cached));
        return cached;
    }

    private Wine canonicalA() {
        return pair.wineAId().equals(first.getId()) ? first : second;
    }

    private Wine canonicalB() {
        return pair.wineBId().equals(second.getId()) ? second : first;
    }

    private void assertGeneratedBundle() {
        var response = service.compare(first.getId(), second.getId(), "es");
        assertThat(response.cached()).isFalse();
        assertThat(response.summary()).contains(first.getName(), second.getName());
        verify(generator).generate(canonicalA(), canonicalB());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<WineComparison>> saved = ArgumentCaptor.forClass(List.class);
        verify(comparisons).saveBundle(saved.capture());
        assertThat(saved.getValue()).extracting(WineComparison::getLanguage).containsExactly("es", "en");
    }
}
