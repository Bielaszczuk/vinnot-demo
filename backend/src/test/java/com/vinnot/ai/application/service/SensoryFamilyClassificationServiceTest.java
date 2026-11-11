package com.vinnot.ai.application.service;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** #541 S9: free-text aroma and flavor descriptors, in Spanish or English, become aroma families. */
class SensoryFamilyClassificationServiceTest {
    private final SensoryFamilyClassificationService service = new SensoryFamilyClassificationService();

    @Test
    void classifiesSpanishDescriptorsIntoTheirFamiliesOnceEach() {
        assertThat(service.classify(List.of("Cereza negra", "Frambuesa", "Violeta", "Vainilla", "Tiza",
                "Pimienta negra", "Hierbas secas")))
                .containsExactly("FRUIT", "FLORAL", "HERBAL", "SPICE", "OAK", "MINERAL");
    }

    @Test
    void classifiesEnglishDescriptorsIntoTheirFamilies() {
        assertThat(service.classify(List.of("Black cherry", "Rose petals", "Fresh mint", "Cinnamon", "Toasted oak",
                "Wet stone"))).containsExactly("FRUIT", "FLORAL", "HERBAL", "SPICE", "OAK", "MINERAL");
    }

    @Test
    void unknownBlankMissingAndFamilylessDescriptorsGiveNoFamily() {
        assertThat(service.classify(Arrays.asList("Miel", "Brioche", "Pasas", "Something odd", " ", null))).isEmpty();
        assertThat(service.classify(List.of())).isEmpty();
        assertThat(service.classify(null)).isEmpty();
    }
}
