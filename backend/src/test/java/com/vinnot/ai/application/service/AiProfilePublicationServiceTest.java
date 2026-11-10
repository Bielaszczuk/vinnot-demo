package com.vinnot.ai.application.service;

import com.vinnot.ai.domain.model.WineAiProfile;
import com.vinnot.ai.domain.repository.WineAiProfileRepository;
import com.vinnot.ai.domain.valueobject.AiContentLanguage;
import com.vinnot.ai.domain.valueobject.AiContentProvenance;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.Test;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.List;
import org.mockito.ArgumentCaptor;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class AiProfilePublicationServiceTest {
    private final WineRepositoryPort wines = mock(WineRepositoryPort.class);
    private final WineAiProfileRepository profiles = mock(WineAiProfileRepository.class);
    private final AiProfilePromptBuilder prompts = mock(AiProfilePromptBuilder.class);
    private final AiProfilePublicationService service = new AiProfilePublicationService(wines, profiles, prompts);
    private final Wine wine = Wine.create("Reserva", null, WineType.RED, UUID.randomUUID());

    @Test
    void rejectsDeletionOrConcurrentCatalogEditBeforePublication() {
        assertThatThrownBy(() -> service.publish(wine, AiContentLanguage.SPANISH, content(), false))
                .isInstanceOf(EntityNotFoundException.class);
        Wine changed = Wine.builder().id(wine.getId()).name("Edited").wineType(WineType.RED).revision(1).build();
        when(wines.findByIdForUpdate(wine.getId())).thenReturn(Optional.of(changed));
        assertThatThrownBy(() -> service.publish(wine, AiContentLanguage.SPANISH, content(), false))
                .isInstanceOf(DomainException.class).extracting("code").isEqualTo("CONCURRENT_UPDATE");
        verifyNoInteractions(profiles);
    }

    @Test
    void preservesManualTranslationUnlessRegenerationIsExplicit() {
        when(wines.findByIdForUpdate(wine.getId())).thenReturn(Optional.of(wine));
        when(prompts.contextFingerprint(wine)).thenReturn("context");
        var manual = WineAiProfile.create(wine.getId(), "es",
                AiContentProvenance.stamp(Map.of("summary", "Curado"), "manual", ""));
        when(profiles.findByWineIdAndLanguage(wine.getId(), "es")).thenReturn(Optional.of(manual));
        when(profiles.saveBundle(any())).thenAnswer(call -> call.getArgument(0));
        assertThat(service.publish(wine, AiContentLanguage.SPANISH, content(), false).summary()).isEqualTo("Curado");
        assertThat(service.publish(wine, AiContentLanguage.SPANISH, content(), true).summary()).isEqualTo("Nuevo");
    }

    private MultilingualAiContent content() {
        return MultilingualAiContent.of(Map.of(AiContentLanguage.SPANISH, Map.of("summary", "Nuevo"),
                AiContentLanguage.ENGLISH, Map.of("summary", "New")));
    }

    @Test
    void discardsRootAndNestedEnrichmentWithoutChangingCatalogFacts() {
        wine.updateGrapes(List.of("Malbec"));
        wine.updateDescriptions("Descripción curada", "Curated description");
        var before = wine.getRevision();
        when(wines.findByIdForUpdate(wine.getId())).thenReturn(Optional.of(wine));
        when(prompts.contextFingerprint(wine)).thenReturn("context");
        when(profiles.saveBundle(any())).thenAnswer(call -> call.getArgument(0));
        var unverified = Map.<String, Object>of("alcoholContent", 14, "allergens", List.of("Sulfites"),
                "descriptionEs", "Inventada", "imageUrl", "https://example.invalid/generated.jpg");
        var bundle = new MultilingualAiContent(Map.of(
                AiContentLanguage.SPANISH, Map.of("summary", "Nuevo", "enrichment", unverified),
                AiContentLanguage.ENGLISH, Map.of("summary", "New", "enrichment", unverified)), unverified);

        assertThat(service.publish(wine, AiContentLanguage.SPANISH, bundle, false).enrichedFields()).isNull();
        verify(wines, never()).save(any());
        assertThat(wine.getDescriptionEs()).isEqualTo("Descripción curada");
        assertThat(wine.getGrapes()).containsExactly("Malbec");
        assertThat(wine.getAlcoholContent()).isNull();
        assertThat(wine.getRevision()).isEqualTo(before);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<WineAiProfile>> saved = ArgumentCaptor.forClass(List.class);
        verify(profiles).saveBundle(saved.capture());
        assertThat(saved.getValue()).allSatisfy(profile ->
                assertThat(profile.getProfileJson()).doesNotContainKey("enrichment"));
    }
}
