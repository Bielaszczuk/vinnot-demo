package com.vinnot.ai.application.service;

import com.vinnot.shared.application.port.AiCompletionService;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.WineType;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import com.vinnot.ai.domain.valueobject.AiContentLanguage;
import com.vinnot.ai.domain.valueobject.AiContentProvenance;
import com.vinnot.wine.domain.valueobject.PriceRange;
import com.vinnot.wine.domain.valueobject.Rating;
import com.vinnot.wine.domain.valueobject.ServingTemperature;
import com.vinnot.wine.domain.valueobject.TasteProfile;
import com.vinnot.winery.domain.model.Winery;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verifyNoInteractions;

class AiProfilePromptBuilderTest {

    private WineryRepositoryPort wineryRepository;
    private AiCompletionService completionService;
    private AiProfilePromptBuilder promptBuilder;

    @BeforeEach
    void setUp() {
        wineryRepository = mock(WineryRepositoryPort.class);
        completionService = mock(AiCompletionService.class);
        promptBuilder = new AiProfilePromptBuilder(wineryRepository, completionService);
    }

    @Test
    void delegatesProviderAvailabilityToTheOutputPort() {
        when(completionService.isAvailable()).thenReturn(true, false);

        assertThat(promptBuilder.isProviderAvailable()).isTrue();
        assertThat(promptBuilder.isProviderAvailable()).isFalse();
    }

    @Test
    void buildsLocalizedWineSpecificPromptAndReturnsProviderResult() {
        Wine wine = wine("Gran Reserva");
        wine.updateGrapes(List.of("Malbec"));
        when(wineryRepository.findById(wine.getWineryId()))
                .thenReturn(Optional.empty());
        when(completionService.chatCompletion(anyString(), eq(0.2), eq(5200)))
                .thenReturn(providerPayload());

        MultilingualAiContent result = promptBuilder.generateMultilingual(
                wine).orElseThrow();

        assertThat(result.content(AiContentLanguage.SPANISH))
                .containsEntry("summary", "Perfil real");
        assertThat(result.content(AiContentLanguage.ENGLISH))
                .containsEntry("summary", "Real profile");
        verify(completionService).chatCompletion(
                argThat(prompt ->
                        prompt.contains("Spanish (Argentina)")
                                && prompt.contains("English")
                                && prompt.contains("Gran Reserva")
                                && prompt.contains("Malbec")
                                && prompt.contains("Complete EVERY section")
                                && prompt.contains("catalog is context, not the limit")
                                && prompt.contains("Estimado") && prompt.contains("Estimated")
                                && prompt.contains("Do not prefix fields or summaries")
                                && prompt.contains("a complete description of the wine in 80-120 words per language")
                                && prompt.contains("fictional illustrations, NOT facts about the catalog wine")
                                && prompt.contains("no new facts")
                                && prompt.contains("never copy grapes, wineries or tasting claims from examples")
                                && prompt.contains("foodPairings: 3-4 concrete dishes")
                                && prompt.contains("Never infer a country from the grape")
                                && prompt.contains("Preserve commercial names unchanged")
                                && !prompt.contains("Replace a placeholder only with supplied evidence")
                                && !prompt.contains("\"enrichment\"")),
                eq(0.2), eq(5200));
    }

    @Test
    void rejectsAnIncompleteProviderProfile() {
        Wine wine = wine("Reserva");
        when(wineryRepository.findById(wine.getWineryId()))
                .thenReturn(Optional.empty());
        when(completionService.chatCompletion(anyString(), eq(0.2), eq(5200)))
                .thenReturn(Map.of());

        assertThat(promptBuilder.generateMultilingual(wine)).isEmpty();
    }

    @Test
    void doesNotAskTheProviderToInventMissingCatalogFields() {
        Wine wine = wine("Reserva");
        when(wineryRepository.findById(wine.getWineryId()))
                .thenReturn(Optional.empty());
        when(completionService.chatCompletion(anyString(), eq(0.2), eq(5200)))
                .thenReturn(providerPayload());

        promptBuilder.generateMultilingual(wine);

        verify(completionService).chatCompletion(
                argThat(prompt ->
                        !prompt.contains("\"enrichment\"") && prompt.contains("Do not return enrichment")),
                eq(0.2), eq(5200));
    }


    @Test
    void asksForACompleteColorOfThisWineAsItsGrapeAndAgeShowIt() {
        // Most reds read "rojo rubí profundo con reflejos violáceos" and most whites "pajizo con reflejos
        // verdosos" while a tasting-vocabulary rule named colors; the owner asked to drop that rule and to keep
        // the color line complete, with the picture following the text (#528).
        Wine wine = wine("Reserva");
        when(wineryRepository.findById(wine.getWineryId()))
                .thenReturn(Optional.empty());
        when(completionService.chatCompletion(anyString(), eq(0.2), eq(5200)))
                .thenReturn(providerPayload());

        promptBuilder.generateMultilingual(wine);

        ArgumentCaptor<String> prompt = ArgumentCaptor.forClass(String.class);
        verify(completionService).chatCompletion(prompt.capture(), eq(0.2), eq(5200));
        assertThat(prompt.getValue())
                .contains("color: a free, complete description of the color THIS bottle shows in the glass",
                        "Build it from the <color_evidence> cues below the catalog",
                        "their cause or the cue wording; with no age cue claim no age",
                        "pale grapes (Pinot Noir, Nebbiolo, Grenache, Sangiovese) evolve sooner",
                        "casi negro, tinta, violeta brillante", "topacio", "piel de cebolla", "or any other precise hue",
                        "Say the depth in your own", "always name the core's hue",
                        "open it as the <color_evidence> block says", "Wines that\n",
                        "'de intensidad media'", "'brillo limpio'", "'deja ver el fondo de la copa'", "'El centro es'",
                        "'Rosa frambuesa de'")
                .doesNotContain("established wine-tasting vocabulary", "at most 20 words", "ribete granate",
                        "Do not default to");
    }

    @Test
    void neverStatesProductionMethodsTheCatalogDoesNotDocument() {
        // A wine fermented in clay amphorae was described as fermented in stainless steel (#519).
        Wine wine = wine("Reserva");
        when(wineryRepository.findById(wine.getWineryId()))
                .thenReturn(Optional.empty());
        when(completionService.chatCompletion(anyString(), eq(0.2), eq(5200)))
                .thenReturn(providerPayload());

        promptBuilder.generateMultilingual(wine);

        ArgumentCaptor<String> prompt = ArgumentCaptor.forClass(String.class);
        verify(completionService).chatCompletion(prompt.capture(), eq(0.2), eq(5200));
        assertThat(prompt.getValue()).contains(WineSpecificityGuidance.PRODUCTION_FACTS_RULES,
                        "stainless steel", "amphorae", "biodynamic", "only when a catalog fact states it",
                        "never mention it and never say it is unknown")
                .doesNotContain("and winemaking and structure when known");
    }

    @Test
    void fingerprintsCatalogAndConfigurationAndDelegatesMockMode() {
        when(completionService.configurationId()).thenReturn("openai:model-a");
        when(completionService.isMockMode()).thenReturn(true);
        assertThat(promptBuilder.isMockMode()).isTrue();
        Wine wine = wine("Reserva");
        String first = promptBuilder.contextFingerprint(wine);
        assertThat(first).hasSize(64).isEqualTo(promptBuilder.contextFingerprint(wine));
        wine.updateDescriptions("Changed context", null);
        assertThat(promptBuilder.contextFingerprint(wine)).isNotEqualTo(first);
        when(completionService.configurationId()).thenReturn("openai:model-b");
        assertThat(promptBuilder.contextFingerprint(wine)).isNotEqualTo(first);
        assertThat(promptBuilder.contextFingerprint(Wine.create("No winery", null, WineType.RED, null))).hasSize(64);
    }

    private Map<String, Object> providerPayload() {
        return Map.of(
                "translations", Map.of(
                        "es", Map.of("summary", "Perfil real"),
                        "en", Map.of("summary", "Real profile")),
                "enrichment", Map.of("grapes", List.of("Malbec")));
    }

    @Test
    void includesDocumentedCatalogFieldsAndExactScoresInOneBilingualRequest() {
        UUID wineryId = UUID.randomUUID();
        Wine wine = Wine.builder().id(UUID.randomUUID()).name("Documented").wineryId(wineryId)
                .wineType(WineType.RED).vintage(2022).style("Dry")
                .descriptionEs("Fruta roja").descriptionEn("Red fruit")
                .alcoholContent(new BigDecimal("13.5")).foodPairing("Mushrooms")
                .tasteProfile(TasteProfile.of(60, 40, 70, 0))
                .rating(Rating.of(new BigDecimal("4.2"), 5)).build();
        when(wineryRepository.findById(wineryId)).thenReturn(Optional.of(
                Winery.builder().id(wineryId).name("Producer")
                        .countryId(UUID.randomUUID()).countryName("Argentina").regionName("Mendoza").build()));
        when(completionService.chatCompletion(anyString(), eq(0.2), eq(5200))).thenReturn(providerPayload());

        assertThat(promptBuilder.generateMultilingual(wine)).isPresent();

        var prompt = ArgumentCaptor.forClass(String.class);
        verify(completionService).chatCompletion(prompt.capture(), eq(0.2), eq(5200));
        assertThat(prompt.getValue()).contains("Vintage: 2022", "Winery: Producer", "Region: Mendoza",
                "Country: Argentina", "Style: Dry", "Description (es): Fruta roja", "Description (en): Red fruit",
                "Alcohol: 13.5%", "Known food pairings: Mushrooms", "Acidity score: 60/100",
                "Tannin score: 40/100", "Body score: 70/100", "Sweetness score: 0/100")
                .doesNotContain("User rating", "4.20/5");
    }

    @Test
    void partialTasteProfilesPublishOnlyTheirDocumentedDimensionIncludingZero() {
        var profiles = List.of(
                TasteProfile.of(0, null, null, null),
                TasteProfile.of(null, 0, null, null),
                TasteProfile.of(null, null, 0, null),
                TasteProfile.of(null, null, null, 0));
        var labels = List.of("Acidity score:", "Tannin score:", "Body score:", "Sweetness score:");
        when(completionService.chatCompletion(anyString(), eq(0.2), eq(5200))).thenReturn(providerPayload());
        for (var profile : profiles) {
            Wine wine = Wine.builder().id(UUID.randomUUID()).name("Partial").wineType(WineType.RED)
                    .tasteProfile(profile).build();
            assertThat(promptBuilder.generateMultilingual(wine)).isPresent();
        }

        var prompts = ArgumentCaptor.forClass(String.class);
        verify(completionService, times(4)).chatCompletion(prompts.capture(), eq(0.2), eq(5200));
        for (int index = 0; index < labels.size(); index++) {
            String prompt = prompts.getAllValues().get(index);
            assertThat(prompt).contains(labels.get(index) + " 0/100");
            for (int other = 0; other < labels.size(); other++) {
                if (other != index) {
                    assertThat(prompt).doesNotContain(labels.get(other));
                }
            }
        }
        verifyNoInteractions(wineryRepository);
    }

    @Test
    void omitsUnknownScoresAndBlankOptionalFieldsWithoutReplacingThemWithZero() {
        Wine wine = Wine.builder().id(UUID.randomUUID()).name("Sparse").wineType(WineType.RED)
                .style(" ").foodPairing(" ").rating(null)
                .tasteProfile(TasteProfile.of(null, null, null, null)).build();
        when(completionService.chatCompletion(anyString(), eq(0.2), eq(5200))).thenReturn(providerPayload());

        assertThat(promptBuilder.generateMultilingual(wine)).isPresent();

        var prompt = ArgumentCaptor.forClass(String.class);
        verify(completionService).chatCompletion(prompt.capture(), eq(0.2), eq(5200));
        assertThat(prompt.getValue()).contains("Name: Sparse").doesNotContain("Style:", "Known food pairings:",
                "Acidity score:", "Tannin score:", "Body score:", "Sweetness score:", "User rating:");
        verifyNoInteractions(wineryRepository);
    }

    @Test
    void prefersTheWineRegionAndSendsEveryDistinguishingCatalogFact() {
        UUID wineryId = UUID.randomUUID();
        Wine wine = Wine.builder().id(UUID.randomUUID()).name("Single Vineyard").wineryId(wineryId)
                .wineType(WineType.RED).regionName("Gualtallary").countryName("Argentina")
                .grapes(List.of("Malbec", "Cabernet Franc"))
                .priceRange(PriceRange.of(new BigDecimal("40"), new BigDecimal("55")))
                .servingTemperature(ServingTemperature.of(15, 17)).natural(true)
                .rating(Rating.of(new BigDecimal("4.3"), 812)).build();
        when(wineryRepository.findById(wineryId)).thenReturn(Optional.of(
                Winery.builder().id(wineryId).name("Producer").regionName("Mendoza").countryName("Chile")
                        .subregion("Tupungato").establishedYear(1998)
                        .descriptionEs("Bodega de altura con vinedos propios.").build()));
        when(completionService.chatCompletion(anyString(), eq(0.2), eq(5200))).thenReturn(providerPayload());

        assertThat(promptBuilder.generateMultilingual(wine)).isPresent();

        var prompt = ArgumentCaptor.forClass(String.class);
        verify(completionService).chatCompletion(prompt.capture(), eq(0.2), eq(5200));
        assertThat(prompt.getValue()).contains("Region: Gualtallary", "Country: Argentina",
                "Winery subregion: Tupungato", "Winery founded: 1998",
                "Winery profile: Bodega de altura con vinedos propios.", "Grapes: Malbec, Cabernet Franc",
                "Catalog price range: 40-55", "Catalog serving temperature: 15-17 °C", "Natural wine: yes")
                .doesNotContain("Region: Mendoza", "Country: Chile", "User rating", "812 ratings", "the user rating");
    }

    @Test
    void truncatesLongWineryProfiles() {
        UUID wineryId = UUID.randomUUID();
        Wine wine = Wine.create("Reserva", wineryId, WineType.RED, null);
        when(wineryRepository.findById(wineryId)).thenReturn(Optional.of(
                Winery.builder().id(wineryId).name("Producer").descriptionEn("x".repeat(900)).build()));
        when(completionService.chatCompletion(anyString(), eq(0.2), eq(5200))).thenReturn(providerPayload());

        promptBuilder.generateMultilingual(wine);

        var prompt = ArgumentCaptor.forClass(String.class);
        verify(completionService).chatCompletion(prompt.capture(), eq(0.2), eq(5200));
        assertThat(prompt.getValue()).contains("Winery profile: " + "x".repeat(400) + "…")
                .doesNotContain("x".repeat(401));
    }

    @Test
    void fingerprintsTheCurrentProfilePromptVersionWithTheCatalogFacts() {
        when(completionService.configurationId()).thenReturn("model-a");
        Wine wine = Wine.create("Reserva", null, WineType.RED, null);
        String facts = WineCatalogFacts.of(wine, null).stream()
                .map(WineCatalogFacts.Fact::render).collect(Collectors.joining(", "));

        assertThat(promptBuilder.contextFingerprint(wine)).isEqualTo(
                AiContentProvenance.fingerprint("profile-v13:wine-description:model-a:" + facts));
    }

    @Test
    void keepsFoodOutOfTheMainDescriptionAndDescribesTheWineAndItsWinery() {
        Wine wine = wine("Reserva");
        when(wineryRepository.findById(wine.getWineryId())).thenReturn(Optional.empty());
        when(completionService.chatCompletion(anyString(), eq(0.2), eq(5200))).thenReturn(providerPayload());

        promptBuilder.generateMultilingual(wine);

        var captured = ArgumentCaptor.forClass(String.class);
        verify(completionService).chatCompletion(captured.capture(), eq(0.2), eq(5200));
        String prompt = captured.getValue();
        String summaryRules = prompt.substring(prompt.indexOf("summary: "), prompt.indexOf("# Specificity"));
        assertThat(summaryRules)
                .contains("summary: the main description, a complete description of the wine",
                        "style, grape, origin and structure, and winemaking only when the catalog states it",
                        "Weave in one or two facts about the winery",
                        "Never name a dish, ingredient or food in the summary; food belongs only in foodPairings.")
                .doesNotContain("close with a concrete dish", "pollo asado", "pescado al horno",
                        "not a producer biography", "food interaction");
        assertThat(prompt).contains("Check that each summary describes the wine and its winery without any food");
    }

    @Test
    void asksForWineSpecificRatherThanDefaultContent() {
        Wine wine = wine("Reserva");
        when(wineryRepository.findById(wine.getWineryId())).thenReturn(Optional.empty());
        when(completionService.chatCompletion(anyString(), eq(0.2), eq(5200))).thenReturn(providerPayload());

        promptBuilder.generateMultilingual(wine);

        var prompt = ArgumentCaptor.forClass(String.class);
        verify(completionService).chatCompletion(prompt.capture(), eq(0.2), eq(5200));
        assertThat(prompt.getValue()).contains("# Specificity",
                "what distinguishes THIS wine from a typical bottle of its grape",
                "Never fall back to habitual midpoints", "Malbec: tannin 55-75",
                "Avoid stock pairings", "pasta with tomato sauce", "blue cheese",
                "region's most emblematic dish (for Argentina, empanadas or asado)",
                "Tie serving advice to the wine's structure", "no decanting for sparkling");
    }

    @Test
    void keepsTheExactProfileSkeletonForEveryLanguage() {
        Wine wine = wine("Reserva");
        when(wineryRepository.findById(wine.getWineryId())).thenReturn(Optional.empty());
        when(completionService.chatCompletion(anyString(), eq(0.2), eq(5200))).thenReturn(providerPayload());

        promptBuilder.generateMultilingual(wine);

        var prompt = ArgumentCaptor.forClass(String.class);
        verify(completionService).chatCompletion(prompt.capture(), eq(0.2), eq(5200));
        for (AiContentLanguage language : AiContentLanguage.values()) {
            assertThat(prompt.getValue()).contains("\"" + language.code() + "\": "
                    + AiProfilePromptLocale.from(language).profileSchema());
        }
    }

    /**
     * Pins every profile prompt line outside the main-description rules (#496 S12), so changes to the shared
     * comparison helpers ({@link WineCatalogFacts}, {@link WineSpecificityGuidance}) never alter the profile.
     * Re-pinned once for the owner's decision to drop the Vinnot user rating from the profile too (#496 L5).
     * Re-pinned for the production-facts rule: how a wine is made or farmed comes only from the catalog (#519).
     * Re-pinned for the tasting-vocabulary rule: descriptors use established wine-tasting terms (#519).
     * Re-pinned for #528: the tasting-vocabulary rule is gone and the color line follows the grape and age.
     * Re-pinned for #531 (profile-v12): the color line is built from this wine's color evidence and varies its wording.
     * Re-pinned for profile-v13: the color line names no place, grape, age, oak or reason, only what is seen.
     */
    @Test
    void keepsEveryProfilePromptLineOutsideTheMainDescriptionRulesIdentical() {
        UUID wineryId = UUID.randomUUID();
        Wine wine = Wine.builder().id(UUID.randomUUID()).name("Single Vineyard").wineryId(wineryId)
                .wineType(WineType.RED).vintage(2021).style("Seco").regionName("Gualtallary")
                .countryName("Argentina").descriptionEs("Fruta negra").descriptionEn("Black fruit")
                .grapes(List.of("Malbec", "Cabernet Franc")).alcoholContent(new BigDecimal("14.0"))
                .priceRange(PriceRange.of(new BigDecimal("40"), new BigDecimal("55")))
                .servingTemperature(ServingTemperature.of(15, 17)).natural(true).foodPairing("Hongos")
                .tasteProfile(TasteProfile.of(60, 70, 80, 5))
                .rating(Rating.of(new BigDecimal("4.3"), 812)).build();
        when(wineryRepository.findById(wineryId)).thenReturn(Optional.of(
                Winery.builder().id(wineryId).name("Producer").regionName("Mendoza").countryName("Chile")
                        .subregion("Tupungato").establishedYear(1998)
                        .descriptionEs("Bodega de altura con vinedos propios.").build()));
        when(completionService.chatCompletion(anyString(), eq(0.2), eq(5200))).thenReturn(providerPayload());

        promptBuilder.generateMultilingual(wine);

        var captured = ArgumentCaptor.forClass(String.class);
        verify(completionService).chatCompletion(captured.capture(), eq(0.2), eq(5200));
        String prompt = captured.getValue();
        String unaffectedBySummaryRules = prompt.substring(0, prompt.indexOf("summary: "))
                + prompt.substring(prompt.indexOf("# Specificity"), prompt.indexOf("\n</catalog>\n") + 11);
        assertThat(AiContentProvenance.fingerprint(unaffectedBySummaryRules)).isEqualTo(UNCHANGED_PROFILE_PROMPT_SHA256);
    }

    /**
     * Color lines came out stock ("Rosa frambuesa de intensidad media" on 15 of 17 rosés) although the prompt listed
     * grape, climate and altitude rules; v12 hands the provider the color cues this wine's own facts support (#531).
     */
    @Test
    void handsTheProviderTheColorCuesOfThisWinesGrapePlaceAndAge() {
        AiProfilePromptBuilder dated = new AiProfilePromptBuilder(wineryRepository, completionService,
                Clock.fixed(Instant.parse("2026-11-07T12:00:00Z"), ZoneOffset.UTC));
        UUID wineryId = UUID.randomUUID();
        Wine wine = Wine.builder().id(UUID.randomUUID()).name("Altura Reserva").wineryId(wineryId)
                .wineType(WineType.RED).vintage(2023).grapes(List.of("Malbec")).build();
        when(wineryRepository.findById(wineryId)).thenReturn(Optional.of(Winery.builder().id(wineryId).name("Bodega")
                .regionName("Salta").countryName("Argentina").subregion("Cafayate").build()));
        when(completionService.chatCompletion(anyString(), eq(0.2), eq(5200))).thenReturn(providerPayload());

        dated.generateMultilingual(wine);

        ArgumentCaptor<String> prompt = ArgumentCaptor.forClass(String.class);
        verify(completionService).chatCompletion(prompt.capture(), eq(0.2), eq(5200));
        String colorEvidence = prompt.getValue().substring(prompt.getValue().indexOf("</catalog>"));
        assertThat(colorEvidence).contains("<color_evidence>",
                "- Grape: Malbec: anthocyanin-rich skins, deep and violet-purple while young\n",
                "- Place: Calchaquí Valleys, Salta (about 1,700-3,100 m)", "inky, near-opaque core",
                "- Age: vintage 2023, about 3 years old;",
                "- Aging: Reserva (Argentine rule: at least 12 months",
                "Open this wine's color line with ", ", in your own words.\n</color_evidence>\nCheck that");
    }

    @Test
    void saysSoWhenTheCatalogSupportsNoColorCue() {
        Wine wine = wine("Cuvée");
        when(wineryRepository.findById(wine.getWineryId())).thenReturn(Optional.empty());
        when(completionService.chatCompletion(anyString(), eq(0.2), eq(5200))).thenReturn(providerPayload());

        promptBuilder.generateMultilingual(wine);

        ArgumentCaptor<String> prompt = ArgumentCaptor.forClass(String.class);
        verify(completionService).chatCompletion(prompt.capture(), eq(0.2), eq(5200));
        assertThat(prompt.getValue()).contains("<color_evidence>\nColor cues derived from this wine's catalog facts",
                "- No grape, place, age or style cue: read the color from the wine type and your knowledge of this "
                        + "wine, naming no place or age effect.\nOpen this wine's color line with ")
                .doesNotContain("- Place:", "- Age:");
    }

    /**
     * v12 color lines named the place behind the color ("La altura del Valle de Uco se expresa en un rubí púrpura",
     * "La madurez mendocina se expresa…"); the owner wants only the color that is seen, with no reason for it.
     */
    @Test
    void keepsPlacesAndCausesOutOfTheColorLine() {
        Wine wine = wine("Cuvée");
        when(wineryRepository.findById(wine.getWineryId())).thenReturn(Optional.empty());
        when(completionService.chatCompletion(anyString(), eq(0.2), eq(5200))).thenReturn(providerPayload());

        promptBuilder.generateMultilingual(wine);

        ArgumentCaptor<String> prompt = ArgumentCaptor.forClass(String.class);
        verify(completionService).chatCompletion(prompt.capture(), eq(0.2), eq(5200));
        assertThat(prompt.getValue()).contains("The color line says only what the eye sees: never name a country, "
                + "region, province, valley or other place, an altitude, the climate or the sun, the grape, the vintage "
                + "or age, oak or barrels, or how the wine was made, and never say why the color looks as it does.")
                .doesNotContain("place, age or style gives the color");
    }

    /** Lines of wines with the same cues open differently, fixed per wine rather than left to sampling (#531). */
    @Test
    void opensEachWinesColorLineFromItsOwnFixedSlot() {
        assertThat(List.of(0, 1, 2, 3, 4).stream()
                .map(slot -> AiProfilePromptBuilder.colorOpening(new UUID(0L, slot))).toList())
                .containsExactly("the hue of the core", "how deep the color reads", "the rim",
                        "the light in the glass or the reflections", "the brightness of the wine or its tears");
        assertThat(AiProfilePromptBuilder.colorOpening(null)).isEqualTo("the hue of the core");
        UUID wine = UUID.randomUUID();
        assertThat(AiProfilePromptBuilder.colorOpening(wine))
                .isEqualTo(AiProfilePromptBuilder.colorOpening(wine));
    }

    private static final String UNCHANGED_PROFILE_PROMPT_SHA256 =
            "f3662a2d184722b152163162cc7c92f790058c3bc34f0b082240cb3c375e0843";

    private Wine wine(String name) {
        return Wine.create(name, UUID.randomUUID(), WineType.RED, UUID.randomUUID());
    }

}
