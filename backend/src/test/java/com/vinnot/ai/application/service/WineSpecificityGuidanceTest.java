package com.vinnot.ai.application.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WineSpecificityGuidanceTest {

    @Test
    void sharesGrapeRangesStockPairingBansAndStructureBasedServingRules() {
        assertThat(WineSpecificityGuidance.CATALOG_GROUNDED_RULES)
                .contains("Never fall back to habitual midpoints", "Malbec: tannin 55-75",
                        "Pinot Noir: tannin 20-40", "pasta with tomato sauce", "blue cheese", "plain roast lamb",
                        "grilled salmon or ceviche", "(for Argentina, empanadas or asado)",
                        "structured reds 16-18 °C", "decant young structured reds 30-60 minutes",
                        "aging windows follow structure, tier and vintage")
                .endsWith("\n")
                .doesNotStartWith(" ");
    }
}
