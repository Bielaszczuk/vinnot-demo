package com.vinnot.marketing.infrastructure.render;

import com.vinnot.marketing.application.port.out.SlideRenderer;
import org.junit.jupiter.api.Test;

import java.awt.Font;
import java.awt.font.TextLayout;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** S4 text wraps and shrinks to fit its box; it never overflows or is cut. */
class TextFitterTest {
    private static final Font SERIF = SlideFonts.bundled().display();
    private static final Font SANS = SlideFonts.bundled().body();

    @Test
    void shortTextKeepsTheLargestSizeOnOneLine() {
        FittedText fitted = TextFitter.fit("Malbec", SERIF, 96, 48, 800, 400, 1.0f);

        assertThat(fitted.fontSize()).isEqualTo(96f);
        assertThat(fitted.lines()).hasSize(1);
        assertThat(fitted.height()).isLessThanOrEqualTo(400f);
    }

    @Test
    void longTextWrapsAndShrinksInsideItsBox() {
        String body = "El Malbec llegó a Mendoza en 1853 de la mano de Michel Pouget y encontró en la altura, el sol y la amplitud "
                + "térmica su mejor versión.";

        FittedText fitted = TextFitter.fit(body, SANS, 60, 24, 600, 260, 1.0f);

        assertThat(fitted.fontSize()).isLessThan(60f).isGreaterThanOrEqualTo(24f);
        assertThat(fitted.lines().size()).isGreaterThan(1);
        assertThat(fitted.height()).isLessThanOrEqualTo(260f);
        assertThat(fitted.width()).isLessThanOrEqualTo(600f);
    }

    @Test
    void wholeWordsAreKeptAndEveryCharacterIsDrawn() {
        String text = "Beber con moderación. Prohibida su venta a menores de 18 años.";

        FittedText fitted = TextFitter.fit(text, SANS, 40, 20, 500, 400, 1.0f);

        int drawn = fitted.lines().stream().mapToInt(TextLayout::getCharacterCount).sum();
        assertThat(drawn).isEqualTo(text.length());
    }

    @Test
    void anUnbreakableWordIsSplitAtTheFloorSizeRatherThanCut() {
        FittedText fitted = TextFitter.fit("W".repeat(40), SERIF, 80, 40, 500, 600, 1.0f);

        assertThat(fitted.fontSize()).isEqualTo(40f);
        assertThat(fitted.lines().size()).isGreaterThan(1);
        assertThat(fitted.width()).isLessThanOrEqualTo(500f);
    }

    @Test
    void textThatDoesNotFitAtTheFloorFailsClearly() {
        assertThatThrownBy(() -> TextFitter.fit("palabra ".repeat(200), SANS, 40, 20, 300, 100, 1.0f))
                .isInstanceOfSatisfying(SlideRenderer.SlideRenderingException.class,
                        exception -> assertThat(exception.reason()).isEqualTo(SlideRenderer.Reason.TEXT_DOES_NOT_FIT))
                .hasMessageContaining("does not fit");
    }

    @Test
    void explicitLineBreaksStartNewLines() {
        FittedText fitted = TextFitter.fit("Uno\nDos\n\nTres", SANS, 30, 20, 800, 400, 1.0f);

        assertThat(fitted.lines()).hasSize(3);
    }

    @Test
    void spanishPunctuationIsKeptAndGlyphsTheFontLacksAreDropped() {
        assertThat(TextFitter.displayable("¿Sabías qué? ¡Año ñandú! 🍷  Salud ✨", SERIF)).isEqualTo("¿Sabías qué? ¡Año ñandú! Salud");
        assertThat(TextFitter.displayable("🍷🍇", SANS)).isEmpty();
    }

    @Test
    void anEmptyTextFitsWithoutLines() {
        FittedText fitted = TextFitter.fit("🍷", SANS, 30, 20, 800, 400, 1.0f);

        assertThat(fitted.lines()).isEmpty();
        assertThat(fitted.height()).isZero();
    }
}
