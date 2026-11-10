package com.vinnot.ai.application.service;

import com.vinnot.ai.domain.model.WineAiProfile;
import com.vinnot.ai.domain.repository.WineAiProfileRepository;
import com.vinnot.ai.domain.valueobject.AiContentLanguage;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Map;
import java.util.EnumMap;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;
import com.vinnot.ai.domain.valueobject.AiContentProvenance;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import java.util.List;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.anyBoolean;

class AiProfileServiceTest {

    private WineAiProfileRepository profileRepository;
    private WineRepositoryPort wineRepository;
    private AiProfilePromptBuilder promptBuilder;
    private MockAiProfileGenerator mockGenerator;
    private AiGenerationCoordinator generationCoordinator;
    private AiProfileService service;

    @BeforeEach
    void setUp() {
        profileRepository = mock(WineAiProfileRepository.class);
        wineRepository = mock(WineRepositoryPort.class);
        promptBuilder = mock(AiProfilePromptBuilder.class);
        when(promptBuilder.contextFingerprint(any())).thenReturn("test-context");
        mockGenerator = mock(MockAiProfileGenerator.class);
        generationCoordinator = mock(AiGenerationCoordinator.class);
        when(generationCoordinator.execute(any(), any(), any()))
                .thenAnswer(invocation -> {
                    Supplier<Optional<Object>> completed = invocation.getArgument(1);
                    Supplier<Object> generation = invocation.getArgument(2);
                    return completed.get().orElseGet(generation);
                });
        when(generationCoordinator.executeExclusively(any(), any()))
                .thenAnswer(invocation -> {
                    Supplier<Object> generation = invocation.getArgument(1);
                    return generation.get();
                });
        service = new AiProfileService(profileRepository, wineRepository,
                promptBuilder, mockGenerator, generationCoordinator,
                new AiProfilePublicationService(wineRepository, profileRepository, promptBuilder));
        when(wineRepository.findByIdForUpdate(any())).thenAnswer(call -> wineRepository.findById(call.getArgument(0)));
    }

    @Test
    void returnsCachedProfileWithoutGeneratingOrSaving() {
        Wine wine = wine("Reserva");
        WineAiProfile cached = WineAiProfile.create(
                wine.getId(), "es", Map.of("summary", "Cache"));
        when(wineRepository.findById(wine.getId())).thenReturn(Optional.of(wine));
        when(profileRepository.findByWineIdAndLanguage(wine.getId(), "es"))
                .thenReturn(Optional.of(cached));
        when(profileRepository.existsByWineIdAndLanguage(wine.getId(), "es"))
                .thenReturn(true);
        when(profileRepository.existsByWineIdAndLanguage(wine.getId(), "en"))
                .thenReturn(true);

        var response = service.get(wine.getId(), "es-AR").orElseThrow();

        assertThat(response.cached()).isTrue();
        assertThat(response.summary()).isEqualTo("Cache");
        verify(profileRepository, never()).save(any());
        verify(mockGenerator, never()).generateMockProfile(any(), any(),
                anyBoolean());
    }

    @Test
    void returnsTheCompleteCachedBundleFromTheGenerationCommand() {
        Wine wine = wine("Reserva");
        WineAiProfile cached = WineAiProfile.create(
                wine.getId(), "en", AiContentProvenance.stamp(
                        Map.of("summary", "Cached"), "provider", "test-context"));
        when(wineRepository.findById(wine.getId())).thenReturn(Optional.of(wine));
        when(profileRepository.existsByWineIdAndLanguage(wine.getId(), "es"))
                .thenReturn(true);
        when(profileRepository.existsByWineIdAndLanguage(wine.getId(), "en"))
                .thenReturn(true);
        when(profileRepository.findByWineIdAndLanguage(wine.getId(), "en"))
                .thenReturn(Optional.of(cached));
        when(profileRepository.findByWineIdAndLanguage(wine.getId(), "es"))
                .thenReturn(Optional.of(WineAiProfile.create(wine.getId(), "es",
                        AiContentProvenance.stamp(
                                Map.of("summary", "Cache"), "provider", "test-context"))));

        var response = service.generate(wine.getId(), "en", false);

        assertThat(response.cached()).isTrue();
        assertThat(response.summary()).isEqualTo("Cached");
        assertThat(service.generate(wine.getId(), "es-AR", false).summary()).isEqualTo("Cache");
        verify(promptBuilder, never()).generateMultilingual(any());
        verify(profileRepository, never()).saveBundle(any());
    }

    @Test
    void doesNotReportACompleteStatusWhenTheOtherLanguageIsMissing() {
        Wine wine = wine("Partial");
        when(wineRepository.findById(wine.getId())).thenReturn(Optional.of(wine));
        when(profileRepository.findByWineIdAndLanguage(wine.getId(), "es"))
                .thenReturn(Optional.of(WineAiProfile.create(wine.getId(), "es", Map.of("summary", "Parcial"))));
        when(profileRepository.existsByWineIdAndLanguage(wine.getId(), "es")).thenReturn(true);
        assertThat(service.getStatus(wine.getId(), "es").status()).isEqualTo("NONE");
    }

    @Test
    void regeneratesAStaleOtherTranslationWhilePreservingManualContent() {
        Wine wine = wine("Manual");
        when(wineRepository.findById(wine.getId())).thenReturn(Optional.of(wine));
        when(profileRepository.findByWineIdAndLanguage(wine.getId(), "es"))
                .thenReturn(Optional.of(WineAiProfile.create(wine.getId(), "es",
                        AiContentProvenance.stamp(Map.of("summary", "Curado"), "manual", ""))));
        when(profileRepository.findByWineIdAndLanguage(wine.getId(), "en"))
                .thenReturn(Optional.of(WineAiProfile.create(wine.getId(), "en",
                        AiContentProvenance.stamp(Map.of("summary", "Stale"), "provider", "old-context"))));
        when(promptBuilder.isProviderAvailable()).thenReturn(true);
        when(promptBuilder.generateMultilingual(wine)).thenReturn(Optional.of(multilingualContent("Nuevo", "New", Map.of())));
        saveBundlesUnchanged();
        assertThat(service.generate(wine.getId(), "es", false).summary()).isEqualTo("Curado");
        verify(promptBuilder).generateMultilingual(wine);
        verify(profileRepository).saveBundle(any());
    }

    @Test
    void replacesAnIncompleteLegacyCacheWithTheFullLanguageBundle() {
        Wine wine = wine("Reserva");
        WineAiProfile legacy = WineAiProfile.create(
                wine.getId(), "es", Map.of("summary", "Legacy"));
        when(wineRepository.findById(wine.getId())).thenReturn(Optional.of(wine));
        when(profileRepository.findByWineIdAndLanguage(wine.getId(), "es"))
                .thenReturn(Optional.of(legacy));
        when(profileRepository.existsByWineIdAndLanguage(wine.getId(), "es"))
                .thenReturn(true);
        when(profileRepository.existsByWineIdAndLanguage(wine.getId(), "en"))
                .thenReturn(false);
        when(promptBuilder.isProviderAvailable()).thenReturn(false);
        when(promptBuilder.isMockMode()).thenReturn(true);
        when(mockGenerator.generateMockProfile(wine, "es", false))
                .thenReturn(Map.of("summary", "Actualizado"));
        when(mockGenerator.generateMockProfile(wine, "en", false))
                .thenReturn(Map.of("summary", "Updated"));
        saveBundlesUnchanged();

        var response = service.generate(wine.getId(), "es-AR", false);

        assertThat(response.cached()).isFalse();
        assertThat(response.summary()).isEqualTo("Actualizado");
        verify(profileRepository).saveBundle(any());
    }

    @Test
    void generatesBothLanguagesWithoutPromotingProviderEnrichmentIntoTheCatalog() {
        Wine wine = wine("Reserva");
        when(wineRepository.findById(wine.getId())).thenReturn(Optional.of(wine));
        when(profileRepository.findByWineIdAndLanguage(wine.getId(), "en"))
                .thenReturn(Optional.empty());
        when(promptBuilder.isProviderAvailable()).thenReturn(true);
        when(promptBuilder.generateMultilingual(wine))
                .thenReturn(Optional.of(multilingualContent(
                        "Generado", "Generated", Map.of("grapes", List.of("Malbec")))));
        saveBundlesUnchanged();

        var response = service.generate(wine.getId(), "en-US", false);

        assertThat(response.cached()).isFalse();
        assertThat(response.summary()).isEqualTo("Generated");
        assertThat(response.enrichedFields()).isNull();
        verify(wineRepository, never()).save(any());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<WineAiProfile>> savedProfiles =
                ArgumentCaptor.forClass(List.class);
        verify(profileRepository).saveBundle(savedProfiles.capture());
        assertThat(savedProfiles.getValue())
                .extracting(WineAiProfile::getLanguage)
                .containsExactlyInAnyOrder("es", "en");
        verify(mockGenerator, never()).generateMockProfile(any(), any(),
                anyBoolean());
    }

    @Test
    void forceRegenerateReplacesTheBundleAndUsesMockWhenOpenAiIsDisabled() {
        Wine wine = wine("Reserva");
        Map<String, Object> generated = Map.of(
                "summary", "Mock",
                "enrichment", Map.of("style", "Structured"));
        when(wineRepository.findById(wine.getId())).thenReturn(Optional.of(wine));
        when(promptBuilder.isProviderAvailable()).thenReturn(false);
        when(promptBuilder.isMockMode()).thenReturn(true);
        when(mockGenerator.generateMockProfile(wine, "es", false))
                .thenReturn(generated);
        when(mockGenerator.generateMockProfile(wine, "en", false))
                .thenReturn(Map.of("summary", "Mock EN"));
        saveBundlesUnchanged();

        var response = service.generate(wine.getId(), "es", true);

        assertThat(response.summary()).isEqualTo("Mock");
        verify(profileRepository).saveBundle(any());
    }

    @Test
    void providerFailureNeverPersistsOrEnrichesMockContent() {
        Wine wine = wine("Reserva");
        when(wineRepository.findById(wine.getId())).thenReturn(Optional.of(wine));
        when(promptBuilder.isProviderAvailable()).thenReturn(true);
        when(promptBuilder.generateMultilingual(wine)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.generate(wine.getId(), "es", false))
                .isInstanceOf(ExternalServiceUnavailableException.class);
        verify(mockGenerator, never()).generateMockProfile(any(), any(), anyBoolean());
        verify(profileRepository, never()).saveBundle(any());
        verify(wineRepository, never()).save(any());
    }

    @Test
    void missingRealProviderDoesNotImplySimulation() {
        Wine wine = wine("Reserva");
        when(wineRepository.findById(wine.getId())).thenReturn(Optional.of(wine));
        assertThatThrownBy(() -> service.generate(wine.getId(), "es", true))
                .isInstanceOf(ExternalServiceUnavailableException.class);
        verify(profileRepository, never()).saveBundle(any());
    }

    @Test
    void updatesExistingProfileAndReportsStatus() {
        Wine wine = wine("Reserva");
        WineAiProfile profile = WineAiProfile.create(
                wine.getId(), "es", Map.of("summary", "Old"));
        when(wineRepository.findById(wine.getId())).thenReturn(Optional.of(wine));
        when(profileRepository.findByWineIdAndLanguage(wine.getId(), "es"))
                .thenReturn(Optional.of(profile));
        when(profileRepository.save(profile)).thenReturn(profile);

        when(profileRepository.existsByWineIdAndLanguage(wine.getId(), "es"))
                .thenReturn(true);
        when(profileRepository.existsByWineIdAndLanguage(wine.getId(), "en"))
                .thenReturn(true);

        var updated = service.update(
                wine.getId(), "es", Map.of("summary", "New"));
        var status = service.getStatus(wine.getId(), "es");

        assertThat(updated.summary()).isEqualTo("New");
        assertThat(status.status()).isEqualTo("GENERATED");
        assertThat(status.generatedAt()).isNotBlank();
    }

    @Test
    void reportsNoneWhenOnlyAnotherLegacyLanguageExists() {
        Wine wine = wine("Reserva");
        WineAiProfile spanishProfile = WineAiProfile.create(
                wine.getId(), "es", Map.of("summary", "Disponible"));
        when(wineRepository.findById(wine.getId())).thenReturn(Optional.of(wine));
        when(profileRepository.findByWineIdAndLanguage(wine.getId(), "en"))
                .thenReturn(Optional.empty());
        when(profileRepository.findByWineIdAndLanguage(wine.getId(), "es"))
                .thenReturn(Optional.of(spanishProfile));

        var status = service.getStatus(wine.getId(), "en-US");

        assertThat(status.status()).isEqualTo("NONE");
        assertThat(status.language()).isEqualTo("en");
        assertThat(status.generatedAt()).isNull();
    }

    @Test
    void normalizesAnUnsupportedAdminLanguageToTheDefaultLanguage() {
        Wine wine = wine("Reserva");
        when(wineRepository.findById(wine.getId())).thenReturn(Optional.of(wine));
        when(profileRepository.findByWineIdAndLanguage(wine.getId(), "es"))
                .thenReturn(Optional.empty());
        when(profileRepository.save(any(WineAiProfile.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.update(
                wine.getId(), "pt", Map.of("summary", "Novo"));

        assertThat(response.summary()).isEqualTo("Novo");
        verify(profileRepository).save(any(WineAiProfile.class));
    }

    @Test
    void rejectsUnknownWineBeforeAccessingProfiles() {
        UUID wineId = UUID.randomUUID();
        when(wineRepository.findById(wineId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(wineId, "es"))
                .isInstanceOf(EntityNotFoundException.class);
        verify(profileRepository, never()).findByWineIdAndLanguage(any(), any());
    }

    @Test
    void rejectsUnknownWineWhenForcingRegeneration() {
        assertUnknownWineIsRejected(id -> service.generate(id, "es", true));
    }

    @Test
    void rejectsUnknownWineWhenReadingStatus() {
        assertUnknownWineIsRejected(id -> service.getStatus(id, "es"));
    }

    @Test
    void rejectsUnknownWineWhenUpdatingProfile() {
        assertUnknownWineIsRejected(id -> service.update(
                id, "es", Map.of("summary", "Missing")));
    }

    private void assertUnknownWineIsRejected(
            Consumer<UUID> operation) {
        UUID wineId = UUID.randomUUID();
        when(wineRepository.findById(wineId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> operation.accept(wineId))
                .isInstanceOf(EntityNotFoundException.class);
    }

    private Wine wine(String name) {
        return Wine.create(name, UUID.randomUUID(), WineType.RED, UUID.randomUUID());
    }

    private void saveBundlesUnchanged() {
        when(profileRepository.saveBundle(any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    private MultilingualAiContent multilingualContent(
            String spanishSummary,
            String englishSummary,
            Map<String, Object> enrichment) {
        Map<AiContentLanguage, Map<String, Object>> translations =
                new EnumMap<>(AiContentLanguage.class);
        translations.put(AiContentLanguage.SPANISH, Map.of("summary", spanishSummary));
        translations.put(AiContentLanguage.ENGLISH, Map.of("summary", englishSummary));
        return new MultilingualAiContent(translations, enrichment);
    }
}
