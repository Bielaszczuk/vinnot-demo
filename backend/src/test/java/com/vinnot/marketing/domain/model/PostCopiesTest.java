package com.vinnot.marketing.domain.model;

import com.vinnot.marketing.domain.exception.InvalidPostCopyException;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** #497 S7: a post's copy per language, with one shared illustration subject and one media hash per language. */
class PostCopiesTest {
    private static final List<PostCopy.Slide> SLIDES = List.of(new PostCopy.Slide("Uno", "a"), new PostCopy.Slide("Dos", "b"),
            new PostCopy.Slide("Tres", "c"));
    private static final PostCopy ES = PostCopy.of(PostLanguage.ES, "Hola", SLIDES, "Texto",
            List.of("#vinnot", "#vino", "#cata", "#copa", "#tinto"), "Alt", "¿Y tú?");
    private static final PostCopy EN = PostCopy.of(PostLanguage.EN, "Hello", SLIDES, "Text",
            List.of("#vinnot", "#wine", "#tasting", "#glass", "#red"), "Alt", "And you?");

    @Test
    void bothLanguagesMakeItCompleteAndOneIsMissingOtherwise() {
        PostCopies both = new PostCopies(ES, EN);
        assertThat(both.complete()).isTrue();
        assertThat(both.languages()).containsExactly(PostLanguage.ES, PostLanguage.EN);
        assertThat(both.get(PostLanguage.EN)).isEqualTo(EN);

        PostCopies spanish = PostCopies.only(PostLanguage.ES, ES);
        assertThat(spanish.complete()).isFalse();
        assertThat(spanish.en()).isNull();
        assertThat(spanish.languages()).containsExactly(PostLanguage.ES);
        assertThat(PostCopies.only(PostLanguage.EN, EN).languages()).containsExactly(PostLanguage.EN);
        assertThat(spanish.with(PostLanguage.EN, EN)).isEqualTo(both);
        assertThat(both.with(PostLanguage.ES, EN).es()).isEqualTo(EN);
        assertThatThrownBy(() -> new PostCopies(null, null)).isInstanceOf(InvalidPostCopyException.class);
    }

    @Test
    void theIllustrationSubjectIsSharedAndEachLanguageHasItsMediaHash() {
        PostCopies both = new PostCopies(ES, EN);
        assertThat(both.illustration()).isNull();
        assertThat(both.mediaHashes()).isEqualTo(Map.of(PostLanguage.ES, ES.mediaHash(), PostLanguage.EN, EN.mediaHash()));

        PostCopies illustrated = both.withIllustration("a bunch of grapes");
        assertThat(illustrated.es().illustration()).isEqualTo("a bunch of grapes");
        assertThat(illustrated.en().illustration()).isEqualTo("a bunch of grapes");
        assertThat(illustrated.illustration()).isEqualTo("a bunch of grapes");
        assertThat(new PostCopies(ES, EN.withIllustration("a cork")).illustration()).isEqualTo("a cork");
        assertThat(PostCopies.only(PostLanguage.EN, EN).withIllustration("x").illustration()).isEqualTo("x");
        assertThat(PostCopies.only(PostLanguage.ES, ES).withIllustration("y").mediaHashes()).containsOnlyKeys(PostLanguage.ES);
    }
}
