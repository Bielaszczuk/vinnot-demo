package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.FactCheckResult;
import com.vinnot.marketing.domain.exception.InvalidPostCopyException;
import com.vinnot.marketing.domain.model.PostCopies;
import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** S4, #497 S7: the model's JSON becomes validated copy in both languages, and its verdict becomes a fact-check result. */
class SocialCopyParserTest {
    private final SocialCopyParser parser = new SocialCopyParser();

    @Test
    void readsBothLanguagesAndAppendsEachLegalLine() {
        PostCopies copies = parser.copies(SocialCopyServiceTest.providerCopies("Hola"));
        PostCopy copy = copies.es();
        assertThat(copy.hook()).isEqualTo("Hola");
        assertThat(copy.slides()).containsExactly(new PostCopy.Slide("Uno", "Primero"), new PostCopy.Slide("Dos", "Segundo"),
                new PostCopy.Slide("Tres", "Tercero"));
        assertThat(copy.caption()).isEqualTo("Un texto corto.\n\n" + PostLanguage.ES.legalLine());
        assertThat(copy.hashtags()).containsExactlyElementsOf(MarketingFixtures.TAGS);
        assertThat(copy.altText()).isEqualTo("Copa de vino");
        assertThat(copy.cta()).isEqualTo("¿Y tú?");
        assertThat(copies.en().hook()).isEqualTo("Hola (en)");
        assertThat(copies.en().caption()).isEqualTo("A short text.\n\n" + PostLanguage.EN.legalLine());
        assertThat(copies.en().hashtags()).as("English hashtags may differ").containsExactlyElementsOf(MarketingFixtures.TAGS_EN);
    }

    @Test
    void bothLanguagesMustBePresentAndValid() {
        Map<String, Object> withoutEnglish = new HashMap<>(SocialCopyServiceTest.providerCopies("Hola"));
        withoutEnglish.remove("en");
        assertThatThrownBy(() -> parser.copies(withoutEnglish)).isInstanceOf(InvalidPostCopyException.class)
                .hasMessage("en: copy is required");

        Map<String, Object> invalidEnglish = new HashMap<>(SocialCopyServiceTest.providerCopies("Hola"));
        Map<String, Object> english = new HashMap<>(SocialCopyServiceTest.providerCopy("Hello", "Text", MarketingFixtures.TAGS_EN));
        english.put("hashtags", List.of("#wine"));
        invalidEnglish.put("en", english);
        assertThatThrownBy(() -> parser.copies(invalidEnglish)).isInstanceOf(InvalidPostCopyException.class).hasMessageStartingWith("en: ");

        Map<String, Object> invalidSpanish = new HashMap<>(SocialCopyServiceTest.providerCopies("Hola"));
        invalidSpanish.put("es", "texto");
        assertThatThrownBy(() -> parser.copies(invalidSpanish)).isInstanceOf(InvalidPostCopyException.class).hasMessage("es: copy is required");
    }

    @Test
    void missingOrMalformedFieldsAreInvalidCopy() {
        assertThatThrownBy(() -> parser.copies(Map.of("es", Map.of("hook", "Hola"), "en", Map.of("hook", "Hello"))))
                .isInstanceOf(InvalidPostCopyException.class);
        assertThatThrownBy(() -> parser.copies(Map.of("es", Map.of("hook", "Hola", "slides", "no", "caption", "c", "hashtags", List.of(),
                "altText", "a", "cta", "c")))).isInstanceOf(InvalidPostCopyException.class).hasMessageContaining("slides");
        assertThatThrownBy(() -> parser.copies(Map.of("es", Map.of("hook", "Hola", "slides", List.of("texto"), "caption", "c",
                "hashtags", MarketingFixtures.TAGS, "altText", "a", "cta", "c")))).isInstanceOf(InvalidPostCopyException.class);
    }

    @Test
    void theFactCheckVerdictDefaultsToOkWithoutIssues() {
        assertThat(parser.factCheck(Map.of("ok", true))).isEqualTo(new FactCheckResult(true, List.of()));
        assertThat(parser.factCheck(Map.of("ok", "false", "issues", List.of("Fecha equivocada", 3))))
                .isEqualTo(new FactCheckResult(false, List.of("Fecha equivocada", "3")));
        assertThat(parser.factCheck(Map.of("issues", List.of("algo")))).isEqualTo(new FactCheckResult(false, List.of("algo")));
        assertThat(parser.factCheck(Map.of())).isEqualTo(new FactCheckResult(true, List.of()));
    }

    @Test
    void aMissingTextFieldIsReportedByLanguageAndName() {
        Map<String, Object> withoutHook = new HashMap<>(SocialCopyServiceTest.providerCopy("Hola", "Un texto corto.", MarketingFixtures.TAGS));
        withoutHook.remove("hook");
        Map<String, Object> json = new HashMap<>(SocialCopyServiceTest.providerCopies("Hola"));
        json.put("es", withoutHook);
        assertThatThrownBy(() -> parser.copies(json)).isInstanceOf(InvalidPostCopyException.class).hasMessage("es: hook is required");
        assertThatThrownBy(() -> parser.copies(null)).isInstanceOf(InvalidPostCopyException.class);
    }

    @Test
    void theOptionalSharedIllustrationSubjectIsReadAndAnUnusableOneIsDropped() {
        HashMap<String, Object> json = new HashMap<>(SocialCopyServiceTest.providerCopies("Hola"));
        assertThat(parser.copies(json).illustration()).isNull();
        json.put("illustration", " a bunch of Merlot grapes on the vine ");
        assertThat(parser.copies(json).es().illustration()).isEqualTo("a bunch of Merlot grapes on the vine");
        assertThat(parser.copies(json).en().illustration()).isEqualTo("a bunch of Merlot grapes on the vine");
        json.put("illustration", "x".repeat(PostCopy.ILLUSTRATION_MAX + 1));
        assertThat(parser.copies(json).illustration()).as("an overlong subject must not discard valid copy").isNull();
        json.put("illustration", 42);
        assertThat(parser.copies(json).illustration()).isEqualTo("42");
    }

    @Test
    void theShapeOfARejectedAnswerNamesItsFieldsAndLengthsWithoutTheText() {
        Map<String, Object> spanish = new HashMap<>(SocialCopyServiceTest.providerCopy("Hola", "Un texto.", List.of("#vinnot")));
        spanish.remove("cta");
        spanish.put("callToAction", 42);
        Map<String, Object> answer = Map.of("es", spanish, "en", "not an object");

        String shape = parser.shape(answer);

        assertThat(shape).contains("es{").contains("hook=4").contains("caption=9").contains("slides=3").contains("hashtags=1")
                .contains("callToAction=Integer").doesNotContain("cta=").contains("en=13").doesNotContain("Hola");
        assertThat(parser.shape(null)).isEqualTo("empty");
    }
}
