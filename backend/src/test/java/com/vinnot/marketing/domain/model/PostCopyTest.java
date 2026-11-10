package com.vinnot.marketing.domain.model;

import com.vinnot.marketing.domain.exception.InvalidPostCopyException;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** S4 limits and the legal line of the copy's language the domain always appends, never the model (#497 S7). */
class PostCopyTest {
    private static final List<PostCopy.Slide> SLIDES = List.of(new PostCopy.Slide("Uno", "Primero"),
            new PostCopy.Slide("Dos", "Segundo"), new PostCopy.Slide("Tres", "Tercero"));

    @Test
    void theLegalLineIsAppendedOnceToTheCaption() {
        PostCopy copy = PostCopy.of(PostLanguage.ES, "Hola", SLIDES, "Un Malbec para hoy.", List.of("#vinnot", "#malbec", "#vino", "#mendoza", "#tinto"),
                "Copa de vino tinto", "¿Con qué lo tomás?");
        assertThat(copy.caption()).isEqualTo("Un Malbec para hoy.\n\n" + PostLanguage.ES.legalLine());
        PostCopy again = PostCopy.of(PostLanguage.ES, "Hola", SLIDES, copy.caption(), copy.hashtags(), copy.altText(), copy.cta());
        assertThat(again.caption()).isEqualTo(copy.caption());
        assertThat(copy.captionWithoutLegalLine()).isEqualTo("Un Malbec para hoy.");
    }

    @Test
    void eachLanguageCarriesItsOwnLegalLineAndNeitherIsEverRepeated() {
        List<String> tags = List.of("#vinnot", "#malbec", "#wine", "#mendoza", "#red");
        PostCopy english = PostCopy.of(PostLanguage.EN, "Hello", SLIDES, "A Malbec for today.", tags, "A glass of red wine", "Cheers?");
        assertThat(english.caption()).isEqualTo("A Malbec for today.\n\nDrink responsibly. Not for sale to anyone under 18.");
        assertThat(PostLanguage.ES.legalLine()).isEqualTo("Beber con moderación. Prohibida su venta a menores de 18 años.");
        assertThat(PostCopy.of(PostLanguage.EN, "Hello", SLIDES, english.caption(), tags, "Alt", "Cheers?").caption())
                .isEqualTo(english.caption());
        assertThat(english.captionWithoutLegalLine()).isEqualTo("A Malbec for today.");
        PostCopy pasted = PostCopy.of(PostLanguage.ES, "Hola", SLIDES, english.caption(), tags, "Alt", "¿Salud?");
        assertThat(pasted.caption()).as("a legal line of the other language is replaced, not kept")
                .isEqualTo("A Malbec for today.\n\n" + PostLanguage.ES.legalLine());
    }

    @Test
    void hashtagsAreNormalisedAndMustIncludeVinnot() {
        PostCopy copy = PostCopy.of(PostLanguage.ES, "Hola", SLIDES, "Texto", List.of(" Vinnot", "#Malbec", "vino ", "#mendoza", "#tinto"),
                "Alt", "¿Y vos?");
        assertThat(copy.hashtags()).containsExactly("#Vinnot", "#Malbec", "#vino", "#mendoza", "#tinto");
        assertThatThrownBy(() -> PostCopy.of(PostLanguage.ES, "Hola", SLIDES, "Texto", List.of("#malbec", "#vino", "#mendoza", "#tinto", "#copa"),
                "Alt", "¿Y vos?")).isInstanceOf(InvalidPostCopyException.class).hasMessageContaining("#vinnot");
        assertThatThrownBy(() -> PostCopy.of(PostLanguage.ES, "Hola", SLIDES, "Texto", List.of("#vinnot", "#vino"), "Alt", "¿Y vos?"))
                .isInstanceOf(InvalidPostCopyException.class).hasMessageContaining("5 to 10");
    }

    @Test
    void lengthsAndSlideCountsAreEnforced() {
        List<String> tags = List.of("#vinnot", "#malbec", "#vino", "#mendoza", "#tinto");
        assertThatThrownBy(() -> PostCopy.of(PostLanguage.ES, "x".repeat(61), SLIDES, "Texto", tags, "Alt", "¿Y vos?"))
                .isInstanceOf(InvalidPostCopyException.class).hasMessageContaining("hook");
        assertThatThrownBy(() -> PostCopy.of(PostLanguage.ES, "Hola", SLIDES.subList(0, 2), "Texto", tags, "Alt", "¿Y vos?"))
                .isInstanceOf(InvalidPostCopyException.class).hasMessageContaining("slides");
        assertThatThrownBy(() -> PostCopy.of(PostLanguage.ES, "Hola", List.of(new PostCopy.Slide("t".repeat(41), "b"), SLIDES.get(0), SLIDES.get(1)),
                "Texto", tags, "Alt", "¿Y vos?")).isInstanceOf(InvalidPostCopyException.class).hasMessageContaining("title");
        assertThatThrownBy(() -> PostCopy.of(PostLanguage.ES, "Hola", SLIDES, "c".repeat(601), tags, "Alt", "¿Y vos?"))
                .isInstanceOf(InvalidPostCopyException.class).hasMessageContaining("caption");
        assertThatThrownBy(() -> PostCopy.of(PostLanguage.ES, "Hola", SLIDES, "Texto", tags, "a".repeat(201), "¿Y vos?"))
                .isInstanceOf(InvalidPostCopyException.class).hasMessageContaining("altText");
        assertThatThrownBy(() -> PostCopy.of(PostLanguage.ES, "Hola", SLIDES, "Texto", tags, "Alt", " "))
                .isInstanceOf(InvalidPostCopyException.class).hasMessageContaining("cta");
        assertThat(PostCopy.of(PostLanguage.ES, "Hola", SLIDES, "c".repeat(600), tags, "Alt", "¿Y vos?").caption()).endsWith(PostLanguage.ES.legalLine());
    }

    @Test
    void theIllustrationSubjectIsOptionalBoundedAndPartOfTheMediaHash() {
        List<String> tags = List.of("#vinnot", "#malbec", "#vino", "#mendoza", "#tinto");
        PostCopy plain = PostCopy.of(PostLanguage.ES, "Hola", SLIDES, "Texto", tags, "Alt", "¿Y vos?");
        assertThat(plain.illustration()).isNull();
        assertThat(PostCopy.of(PostLanguage.ES, "Hola", SLIDES, "Texto", tags, "Alt", "¿Y vos?", "  ").illustration()).isNull();
        PostCopy illustrated = PostCopy.of(PostLanguage.ES, "Hola", SLIDES, "Texto", tags, "Alt", "¿Y vos?", " a bunch of Malbec grapes ");
        assertThat(illustrated.illustration()).isEqualTo("a bunch of Malbec grapes");
        assertThatThrownBy(() -> PostCopy.of(PostLanguage.ES, "Hola", SLIDES, "Texto", tags, "Alt", "¿Y vos?", "x".repeat(201)))
                .isInstanceOf(InvalidPostCopyException.class).hasMessageContaining("illustration");
        assertThat(PostCopy.of(PostLanguage.ES, "Hola", SLIDES, "Texto", tags, "Alt", "¿Y vos?", "x".repeat(200)).illustration()).hasSize(200);

        assertThat(plain.mediaHash()).matches("[0-9a-f]{64}").isEqualTo(PostCopy.of(PostLanguage.ES, "Hola", SLIDES, "Otro texto", tags, "Otro alt",
                "¿Y vos?").mediaHash());
        assertThat(illustrated.mediaHash()).isNotEqualTo(plain.mediaHash());
        assertThat(PostCopy.of(PostLanguage.ES, "Chau", SLIDES, "Texto", tags, "Alt", "¿Y vos?").mediaHash()).isNotEqualTo(plain.mediaHash());
        assertThat(PostCopy.of(PostLanguage.ES, "Hola", SLIDES, "Texto", tags, "Alt", "¿Y ella?").mediaHash()).isNotEqualTo(plain.mediaHash());
        assertThat(PostCopy.of(PostLanguage.ES, "Hola", List.of(SLIDES.get(1), SLIDES.get(0), SLIDES.get(2)), "Texto", tags, "Alt", "¿Y vos?").mediaHash())
                .isNotEqualTo(plain.mediaHash());

        assertThat(plain.withIllustration("grapes").illustration()).isEqualTo("grapes");
        assertThat(plain.withIllustration("grapes").hook()).isEqualTo(plain.hook());
        assertThat(new PostCopy(plain.hook(), plain.slides(), plain.caption(), plain.hashtags(), plain.altText(), plain.cta()))
                .isEqualTo(plain);
    }
}
