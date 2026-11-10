package com.vinnot.marketing.application.service;

import com.vinnot.marketing.domain.model.DateRule;
import com.vinnot.marketing.domain.model.PostCopies;
import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.WineDay;
import com.vinnot.marketing.domain.model.WineDayKind;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/** S4, #497 S3-S5 and S7: the prompt carries the voice, the pillar brief, the wine day and the bilingual JSON contract. */
class SocialCopyPromptBuilderTest {
    private final SocialCopyPromptBuilder builder = new SocialCopyPromptBuilder();

    @Test
    void theCopyPromptNamesTheVoiceThePillarAndTheDay() {
        String prompt = builder.copyPrompt(MarketingFixtures.WINE_DAY, MarketingFixtures.MERLOT, LocalDate.of(2026, 11, 7));
        assertThat(prompt).contains(SocialCopyPromptBuilder.VOICE, "Celebrate the day.", "International Merlot Day",
                        "Día Internacional del Merlot", "Saturday 7 November 2026", "\"hook\"", "60", "\"slides\"", "3 to 7", "40", "160",
                        "\"caption\"", "600", "\"hashtags\"", "5 to 10", "#vinnot", "\"altText\"", "200", "\"cta\"")
                .doesNotContain(PostLanguage.ES.legalLine(), PostLanguage.EN.legalLine(), "vinnot.com/share");
    }

    @Test
    void oneAnswerCarriesTheSpanishAndTheEnglishCopyAndTheSharedIllustration() {
        String prompt = builder.copyPrompt(MarketingFixtures.CURIOUS_FACT, null, LocalDate.of(2026, 11, 3));
        assertThat(prompt).contains("\"es\": COPY", "\"en\": COPY", "Spanish and English hashtags may differ",
                "an adaptation, not a word-for-word translation", "N facts about X.");
    }

    @Test
    void theVoiceIsGlobalRefinedAndNeutralWithoutArgentineFramingOrALocalTime() {
        String prompt = builder.copyPrompt(MarketingFixtures.WINE_DAY, MarketingFixtures.MERLOT, LocalDate.of(2026, 11, 7));
        assertThat(prompt).contains("sommelier", "neutral Spanish", "\"tú\"", "no voseo", "no regional slang",
                        "malolactic fermentation", "explained in a few words", "not described as Argentine", "time zone")
                .doesNotContain("rioplatense", "una app argentina", "hora Argentina", "19:00", "anti snob");
    }

    @Test
    void everyPostTeachesSomethingNonObviousWithoutClichesOrLocalFolklore() {
        String prompt = builder.copyPrompt(MarketingFixtures.CURIOUS_FACT, null, LocalDate.of(2026, 11, 3));
        assertThat(prompt).contains(SocialCopyPromptBuilder.DEPTH, "non-obvious", "a casual wine drinker would not know",
                "one topic in depth", "el vino es cultura", "local folklore");
    }

    @Test
    void factsAndCuriositiesAreRequiredAndAWineDayExplainsWhyItExists() {
        String prompt = builder.copyPrompt(MarketingFixtures.WINE_DAY, MarketingFixtures.MERLOT, LocalDate.of(2026, 11, 7));
        assertThat(prompt).contains("origin and history", "main regions", "body, acidity, tannin, aromatics", "ageing potential",
                "why the day exists", "at least two concrete facts", "No filler", "no jokes at the expense of wine culture");
    }

    @Test
    void pairingsGoByCategoryExplainedByStructureAndNeverStreetFood() {
        String prompt = builder.copyPrompt(MarketingFixtures.CURIOUS_FACT, null, LocalDate.of(2026, 11, 3));
        assertThat(prompt).contains("quesos de pasta dura y madurados (parmesano, pecorino)",
                        "quesos semiduros de tenor graso medio (fontina, gruyère)", "carnes rojas", "carnes blancas", "pescados grasos",
                        "hongos y verduras asadas", "fat, acidity, tannin, salt",
                        "Never street food or fast food (pizza, empanadas, choripán, hamburguesas, alfajores, helado)",
                        "never a single home dish")
                .doesNotContain("comida de todos los días", "maridajes anti snob");
    }

    @Test
    void onlyTheAppFeaturePillarMayNameTheAppAndItsLink() {
        String feature = builder.copyPrompt(MarketingFixtures.APP_FEATURE, null, LocalDate.of(2026, 11, 10));
        assertThat(feature).contains("vinnot.com/share", "Show one feature.").doesNotContain("International");
        String fact = builder.copyPrompt(MarketingFixtures.CURIOUS_FACT, null, LocalDate.of(2026, 11, 3));
        assertThat(fact).contains("Do not mention the app").doesNotContain("vinnot.com/share");
    }

    @Test
    void theFactCheckPromptQuotesBothLanguagesAndAsksForAVerdict() {
        String prompt = builder.factCheckPrompt(MarketingFixtures.COPIES);
        assertThat(prompt).contains("Fact-check", "[es]", "Merlot, el tinto amable", "Burdeos, siglo XVIII.", "Hoy es el día del Merlot.",
                        "[en]", "Merlot, the gentle red", "Bordeaux, 18th century.", "contradicts", "\"ok\"", "\"issues\"", "in Spanish")
                .doesNotContain(PostLanguage.ES.legalLine());
        assertThat(builder.factCheckPrompt(PostCopies.only(PostLanguage.ES, MarketingFixtures.COPY))).contains("[es]").doesNotContain("[en]");
    }

    @Test
    void aNationalWineDayNamesItsCountry() {
        WineDay torrontes = new WineDay("TORRONTES", "Día del Torrontés", "Torrontés Day", WineDayKind.GRAPE, DateRule.parse("fixed:10-04"),
                1, "AR");
        String prompt = builder.copyPrompt(MarketingFixtures.WINE_DAY, torrontes, LocalDate.of(2026, 10, 4));
        assertThat(prompt).contains("That day is Torrontés Day (in Spanish: Día del Torrontés), from AR: the post is about that day.");
        String international = builder.copyPrompt(MarketingFixtures.WINE_DAY, MarketingFixtures.MERLOT, LocalDate.of(2026, 11, 7));
        assertThat(international).contains("(in Spanish: Día Internacional del Merlot): the post").doesNotContain(", from ");
    }

    @Test
    void theCopyPromptAsksForAnEnglishIllustrationSubjectWithoutTextOrPeople() {
        String prompt = builder.copyPrompt(MarketingFixtures.CURIOUS_FACT, null, LocalDate.of(2026, 11, 3));
        assertThat(prompt).contains("\"illustration\": \"in English").contains(String.valueOf(PostCopy.ILLUSTRATION_MAX))
                .contains("no text").contains("no people");
    }

    @Test
    void theLimitsAreHardCharacterLimitsAndARewriteQuotesTheRejection() {
        String prompt = builder.copyPrompt(MarketingFixtures.CURIOUS_FACT, null, LocalDate.of(2026, 11, 3));
        assertThat(prompt).contains("is a hard limit").contains("Spanish runs longer than English");
        assertThat(builder.rewritePrompt(prompt, "es: slide body must hold at most 160 characters")).startsWith(prompt)
                .contains("Your previous answer was rejected: es: slide body must hold at most 160 characters")
                .contains("Write the whole answer again");
    }

    @Test
    void theCallToActionIsRequiredInEachLanguageAndSaysWhatItHolds() {
        String prompt = builder.copyPrompt(MarketingFixtures.CURIOUS_FACT, null, LocalDate.of(2026, 11, 3));
        assertThat(prompt).contains("\"cta\": \"required in both languages, never empty, up to 200 characters")
                .contains("the closing question for the comments")
                .contains("never at the end of the caption, and every COPY has every field").contains("at most 22 words");
        assertThat(prompt.indexOf("\"cta\"")).as("the call to action comes right after the hook, before the slides")
                .isLessThan(prompt.indexOf("\"slides\""));
    }
}
