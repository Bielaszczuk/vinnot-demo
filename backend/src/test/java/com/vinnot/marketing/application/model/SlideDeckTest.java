package com.vinnot.marketing.application.model;

import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** S4 render inputs and outputs keep their own copies and reject incomplete data. */
class SlideDeckTest {
    private static final List<PostCopy.Slide> SLIDES = List.of(new PostCopy.Slide("Uno", "Primero"),
            new PostCopy.Slide("Dos", "Segundo"), new PostCopy.Slide("Tres", "Tercero"));

    @Test
    void aDeckFromThePostCopyCarriesTheLegalLineAndCountsCoverAndClosing() {
        PostCopy copy = PostCopy.of(PostLanguage.ES, "Hola", SLIDES, "Un Malbec para hoy.",
                List.of("#vinnot", "#malbec", "#vino", "#mendoza", "#tinto"), "Copa de vino tinto", "¿Con qué lo acompañas?");

        SlideDeck deck = SlideDeck.of(copy, null, "WINE_DAY", PostLanguage.ES);

        assertThat(deck.legalLine()).isEqualTo(PostLanguage.ES.legalLine());
        assertThat(deck.language()).isEqualTo("es");
        assertThat(deck.slides()).isEqualTo(SLIDES);
        assertThat(deck.slideCount()).isEqualTo(5);
        assertThat(deck.hasIllustration()).isFalse();
        assertThat(deck.illustrationPng()).isNull();
    }

    @Test
    void anEnglishDeckClosesWithTheEnglishLegalLine() {
        PostCopy copy = PostCopy.of(PostLanguage.EN, "Hello", SLIDES, "A Malbec for today.",
                List.of("#vinnot", "#malbec", "#wine", "#mendoza", "#red"), "A glass of red wine", "What would you pair it with?");

        SlideDeck deck = SlideDeck.of(copy, null, "WINE_DAY", PostLanguage.EN);

        assertThat(deck.legalLine()).isEqualTo("Drink responsibly. Not for sale to anyone under 18.");
        assertThat(deck.language()).isEqualTo("en");
        assertThat(deck.cta()).isEqualTo("What would you pair it with?");
    }

    @Test
    void theIllustrationAndTheSlidesAreDefensivelyCopied() {
        byte[] png = {1, 2, 3};
        List<PostCopy.Slide> slides = new ArrayList<>(SLIDES);
        SlideDeck deck = new SlideDeck("Hola", slides, "Contanos", PostLanguage.ES.legalLine(), png, "QUIZ", "es");

        png[0] = 9;
        slides.clear();
        deck.illustrationPng()[1] = 9;

        assertThat(deck.illustrationPng()).containsExactly(1, 2, 3);
        assertThat(deck.slides()).hasSize(3);
        assertThat(deck.hasIllustration()).isTrue();
        assertThat(deck).isEqualTo(new SlideDeck("Hola", SLIDES, "Contanos", PostLanguage.ES.legalLine(), new byte[] {1, 2, 3}, "QUIZ", "es"));
    }

    @Test
    void requiredFieldsAreValidated() {
        assertThatThrownBy(() -> new SlideDeck(" ", SLIDES, "c", "l", null, "QUIZ", "es")).hasMessageContaining("hook");
        assertThatThrownBy(() -> new SlideDeck("h", List.of(), "c", "l", null, "QUIZ", "es")).hasMessageContaining("slides");
        assertThatThrownBy(() -> new SlideDeck("h", SLIDES, null, "l", null, "QUIZ", "es")).hasMessageContaining("cta");
        assertThatThrownBy(() -> new SlideDeck("h", SLIDES, "c", "", null, "QUIZ", "es")).hasMessageContaining("legalLine");
        assertThatThrownBy(() -> new SlideDeck("h", SLIDES, "c", "l", null, null, "es")).hasMessageContaining("pillarCode");
        assertThatThrownBy(() -> new SlideDeck("h", SLIDES, "c", "l", null, "QUIZ", " ")).hasMessageContaining("language");
    }

    @Test
    void formatsHaveTheirPlatformSizes() {
        assertThat(SlideFormat.INSTAGRAM.width()).isEqualTo(1080);
        assertThat(SlideFormat.INSTAGRAM.height()).isEqualTo(1350);
        assertThat(SlideFormat.TIKTOK.width()).isEqualTo(1080);
        assertThat(SlideFormat.TIKTOK.height()).isEqualTo(1920);
    }

    @Test
    void aRenderedSlideKeepsItsOwnBytes() {
        byte[] jpeg = {(byte) 0xFF, (byte) 0xD8, 1};
        RenderedSlide slide = new RenderedSlide(0, jpeg, 1080, 1350);

        jpeg[2] = 7;
        slide.jpeg()[2] = 8;

        assertThat(slide.jpeg()).containsExactly((byte) 0xFF, (byte) 0xD8, 1);
        assertThat(slide).isEqualTo(new RenderedSlide(0, new byte[] {(byte) 0xFF, (byte) 0xD8, 1}, 1080, 1350));
        assertThatThrownBy(() -> new RenderedSlide(-1, jpeg, 1, 1)).hasMessageContaining("index");
        assertThatThrownBy(() -> new RenderedSlide(0, new byte[0], 1, 1)).hasMessageContaining("empty");
        assertThatThrownBy(() -> new RenderedSlide(0, jpeg, 0, 1)).hasMessageContaining("positive");
    }
}
