package com.vinnot.marketing.infrastructure.render;

import org.junit.jupiter.api.Test;

import java.awt.Color;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/** Every text colour of the slides meets WCAG AA (4.5:1) on the cream paper. */
class SlidePaletteTest {

    @Test
    void contrastFollowsTheWcagFormula() {
        assertThat(SlidePalette.contrastRatio(Color.BLACK, Color.WHITE)).isCloseTo(21.0, within(0.01));
        assertThat(SlidePalette.contrastRatio(Color.WHITE, Color.WHITE)).isCloseTo(1.0, within(0.01));
    }

    @Test
    void textColoursMeetAaOnTheCreamBackground() {
        assertThat(SlidePalette.contrastRatio(SlidePalette.SEPIA, SlidePalette.CREAM)).isGreaterThanOrEqualTo(4.5);
        assertThat(SlidePalette.contrastRatio(SlidePalette.WINE, SlidePalette.CREAM)).isGreaterThanOrEqualTo(4.5);
        assertThat(SlidePalette.contrastRatio(SlidePalette.OLIVE, SlidePalette.CREAM)).isGreaterThanOrEqualTo(4.5);
    }
}
