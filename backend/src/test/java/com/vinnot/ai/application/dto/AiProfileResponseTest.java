package com.vinnot.ai.application.dto;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AiProfileResponseTest {

    @Test
    void namesTheMainHueAndTheRimOfTheVisualColorLine() {
        Map<String, Object> profile = Map.of("visualAnalysis",
                Map.of("color", "Rojo granate de intensidad media, con reflejos teja en los bordes."));

        AiProfileResponse response = AiProfileResponse.from(UUID.randomUUID(), "es", profile, Instant.EPOCH, true);

        assertThat(response.visualColorTone()).isEqualTo("RED_GARNET");
        assertThat(response.visualColorIntensity()).isEqualTo("MEDIUM");
        assertThat(response.visualRimTone()).isEqualTo("RED_TAWNY");
        assertThat(response.visualReflectionTones()).containsExactly("RED_TAWNY");
    }

    @Test
    void namesTheSwatchThatMatchesTheVisualColorLine() {
        Map<String, Object> profile = Map.of("summary", "Texto",
                "visualAnalysis", Map.of("color", "Rojo violáceo profundo, con reflejos púrpura."));

        AiProfileResponse response = AiProfileResponse.from(UUID.randomUUID(), "es", profile, Instant.EPOCH, true);

        assertThat(response.visualColorTone()).isEqualTo("RED_PURPLE");
        assertThat(response.visualColorIntensity()).isEqualTo("DEEP");
        assertThat(response.visualRimTone()).isNull();
        assertThat(response.visualHighlights()).isTrue();
        assertThat(response.visualReflectionTones()).containsExactly("RED_PURPLE");
        assertThat(response.visualAnalysis()).containsEntry("color", "Rojo violáceo profundo, con reflejos púrpura.");
    }

    @Test
    void leavesTheSwatchOutWithoutARecognizableColor() {
        assertThat(AiProfileResponse.from(UUID.randomUUID(), "es", Map.of("summary", "Texto"), Instant.EPOCH, true)
                .visualColorTone()).isNull();
        assertThat(AiProfileResponse.from(UUID.randomUUID(), "es", Map.of("summary", "Texto"), Instant.EPOCH, true)
                .visualHighlights()).isFalse();
        assertThat(AiProfileResponse.from(UUID.randomUUID(), "es", Map.of("summary", "Texto"), Instant.EPOCH, true)
                .visualColorIntensity()).isNull();
        assertThat(AiProfileResponse.from(UUID.randomUUID(), "es",
                Map.of("visualAnalysis", Map.of("color", "Rojo rubí con borde granate.")), Instant.EPOCH, true)
                .visualColorIntensity()).isNull();
        assertThat(AiProfileResponse.from(UUID.randomUUID(), "en",
                Map.of("visualAnalysis", Map.of("clarity", "Bright")), Instant.EPOCH, true).visualColorTone()).isNull();
        assertThat(AiProfileResponse.from(UUID.randomUUID(), "en",
                Map.of("visualAnalysis", Map.of("color", 7)), Instant.EPOCH, true).visualColorTone()).isNull();
    }

    @Test
    void namesTheArtOfEverySectionFromTheStoredProfile() {
        Map<String, Object> profile = Map.of(
                "aromaticProfile", Map.of(
                        "primaryAromas", List.of("Frambuesa", "Fermentación", "Mora"),
                        "secondaryAromas", List.of("Frambuesa en compota", "Hierbas secas", 7)),
                "flavorProfile", Map.of(
                        "primaryFlavors", List.of("Pera", "Té negro"),
                        "secondaryFlavors", "Miel"),
                "foodPairings", Map.of(
                        "pairings", List.of("Pollo asado con hierbas", "Comida especiada", "Pollo al curry", "Risotto de hongos"),
                        "explanation", "Texto"),
                "servingRecommendations", Map.of(
                        "glassware", "Copa amplia tipo Borgoña",
                        "decanting", "Decantar 45 minutos",
                        "temperature", "16–18 °C"));

        ProfileArt art = AiProfileResponse.from(UUID.randomUUID(), "es", profile, Instant.EPOCH, true).profileArt();

        assertThat(art.aromas()).containsExactly(
                new ProfileArtEntry("Frambuesa", "RASPBERRY"),
                new ProfileArtEntry("Mora", "BLACKBERRY"),
                new ProfileArtEntry("Hierbas secas", "DRIED_HERBS"));
        assertThat(art.flavors()).containsExactly(
                new ProfileArtEntry("Pera", "PEAR"),
                new ProfileArtEntry("Té negro", "TEA"));
        assertThat(art.pairings()).containsExactly(
                new ProfileArtEntry("Pollo asado con hierbas", "POULTRY"),
                new ProfileArtEntry("Pollo al curry", "CURRY"),
                new ProfileArtEntry("Risotto de hongos", "RISOTTO"));
        assertThat(art.serving()).isEqualTo(
                new ProfileArtServing("RED_BALLOON", true, new ProfileArtTemperature(16, 18)));
    }

    @Test
    void readsPairingsStoredAsAPlainList() {
        Map<String, Object> profile = Map.of("foodPairings", List.of("Ostras", "Cordero al horno"));

        ProfileArt art = AiProfileResponse.from(UUID.randomUUID(), "en", profile, Instant.EPOCH, true).profileArt();

        assertThat(art.pairings()).containsExactly(
                new ProfileArtEntry("Ostras", "SEAFOOD"),
                new ProfileArtEntry("Cordero al horno", "LAMB"));
    }

    @Test
    void keepsAnEmptyArtWhenTheSectionsAreMissingOrOdd() {
        ProfileArt missing = AiProfileResponse.from(UUID.randomUUID(), "es", Map.of("summary", "Texto"), Instant.EPOCH, true)
                .profileArt();
        ProfileArt odd = ProfileArt.from(Map.of(
                "aromaticProfile", "Frambuesa",
                "flavorProfile", Map.of("primaryFlavors", Map.of("a", "Pera")),
                "foodPairings", 3,
                "servingRecommendations", Map.of("glassware", 1, "decanting", List.of("Decantar"), "temperature", 16)));

        for (ProfileArt art : List.of(missing, odd)) {
            assertThat(art.aromas()).isEmpty();
            assertThat(art.flavors()).isEmpty();
            assertThat(art.pairings()).isEmpty();
            assertThat(art.serving()).isEqualTo(new ProfileArtServing(null, false, null));
        }
    }

    @Test
    void picksTheGlassFromTheWineColorWhenTheGlasswareNamesNoShape() {
        Map<String, Object> red = Map.of(
                "visualAnalysis", Map.of("color", "Light ruby red, with garnet hints at the rim."),
                "servingRecommendations", Map.of("glassware",
                        "A medium-sized glass with a generous bowl allows the aromas to open."));
        Map<String, Object> white = Map.of(
                "visualAnalysis", Map.of("color", "Amarillo pajizo con reflejos verdosos."),
                "servingRecommendations", Map.of("glassware", "Copa de cristal fino"));
        Map<String, Object> unknown = Map.of("servingRecommendations", Map.of("glassware", "Copa de cristal fino"));

        assertThat(AiProfileResponse.from(UUID.randomUUID(), "en", red, Instant.EPOCH, true)
                .profileArt().serving().glass()).isEqualTo("RED_BALLOON");
        assertThat(AiProfileResponse.from(UUID.randomUUID(), "es", white, Instant.EPOCH, true)
                .profileArt().serving().glass()).isEqualTo("WHITE_TULIP");
        assertThat(AiProfileResponse.from(UUID.randomUUID(), "es", unknown, Instant.EPOCH, true)
                .profileArt().serving().glass()).isNull();
    }
}
