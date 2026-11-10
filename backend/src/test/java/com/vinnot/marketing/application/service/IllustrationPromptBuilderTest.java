package com.vinnot.marketing.application.service;

import com.vinnot.marketing.domain.model.ContentPillar;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** S1: the hero subject comes from the copy, else from the wine day or the pillar, and the prompt carries the owner's style. */
class IllustrationPromptBuilderTest {
    private final IllustrationPromptBuilder builder = new IllustrationPromptBuilder();

    @Test
    void theCopySubjectWinsThenTheWineDayThenThePillar() {
        assertThat(builder.subject(MarketingFixtures.COPIES.withIllustration("a corkscrew"), "WINE_DAY", MarketingFixtures.MERLOT))
                .isEqualTo("a corkscrew");
        assertThat(builder.subject(MarketingFixtures.COPIES, "WINE_DAY", MarketingFixtures.MERLOT)).contains("International Merlot Day");
        for (String pillar : List.of(ContentPillar.WINE_DAY, "CURIOUS_FACT", "EDUCATION", "MYTH_VS_REALITY", "QUIZ", "PAIRING",
                "GRAPE_OF_MONTH", "HUMOR", ContentPillar.APP_FEATURE)) {
            assertThat(builder.subject(MarketingFixtures.COPIES, pillar, null)).isNotBlank().isNotEqualTo(IllustrationPromptBuilder.DEFAULT_SUBJECT);
        }
        assertThat(builder.subject(MarketingFixtures.COPIES, "UNKNOWN", null)).isEqualTo(IllustrationPromptBuilder.DEFAULT_SUBJECT);
    }

    @Test
    void thePairingHeroShowsARefinedSpreadAndNeverStreetFood() {
        assertThat(builder.subject(MarketingFixtures.COPIES, "PAIRING", null)).doesNotContain("empanada", "pizza")
                .contains("cheese");
    }

    @Test
    void thePromptCarriesTheStyleRecipeTheSubjectAndTheTransparencyRules() {
        String prompt = builder.prompt("a bunch of Malbec grapes");
        assertThat(prompt).contains("a bunch of Malbec grapes")
                .contains("detailed hand-painted watercolor, fine sepia ink linework, warm sepia, cream, aged oak, olive and soft wine red "
                        + "palette, paper grain, warm light, elegant premium editorial feel")
                .contains("fully transparent background, no text, no letters, no numbers, no logos, no faces, no people")
                .contains("empty space around");
    }
}
