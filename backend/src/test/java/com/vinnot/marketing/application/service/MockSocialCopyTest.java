package com.vinnot.marketing.application.service;

import com.vinnot.marketing.domain.model.PostCopies;
import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/** S4: in mock mode the copy is deterministic and still valid; #497 S12: in both languages, without regional terms. */
class MockSocialCopyTest {
    private final MockSocialCopy mock = new MockSocialCopy();

    @Test
    void writesTheSameValidCopyForTheSamePostInBothLanguages() {
        PostCopies first = mock.write(MarketingFixtures.WINE_DAY, MarketingFixtures.MERLOT, LocalDate.of(2026, 11, 7));
        PostCopies second = mock.write(MarketingFixtures.WINE_DAY, MarketingFixtures.MERLOT, LocalDate.of(2026, 11, 7));
        assertThat(first).isEqualTo(second);
        assertThat(first.complete()).isTrue();
        assertThat(first.es().hook()).contains("Merlot");
        assertThat(first.es().caption()).contains("Día Internacional del Merlot").endsWith(PostLanguage.ES.legalLine());
        assertThat(first.en().hook()).isEqualTo("Today is International Merlot Day");
        assertThat(first.en().caption()).contains("International Merlot Day").endsWith(PostLanguage.EN.legalLine());
        assertThat(first.es().hashtags()).contains("#vinnot");
        assertThat(first.en().hashtags()).contains("#vinnot", "#wine");
        PostCopies feature = mock.write(MarketingFixtures.APP_FEATURE, null, LocalDate.of(2026, 11, 10));
        assertThat(feature.es().cta()).contains("vinnot.com/share");
        assertThat(feature.en().cta()).contains("vinnot.com/share");
        PostCopies fact = mock.write(MarketingFixtures.CURIOUS_FACT, null, LocalDate.of(2026, 11, 3));
        assertThat(fact.es().cta()).doesNotContain("vinnot.com");
        assertThat(fact.en().hook()).isEqualTo("Curious fact of the week");
    }

    @Test
    void theSpanishIsNeutralWithoutVoseoRegionalTagsOrALocalTime() {
        for (PostCopies copies : new PostCopies[] {
                mock.write(MarketingFixtures.WINE_DAY, MarketingFixtures.MERLOT, LocalDate.of(2026, 11, 7)),
                mock.write(MarketingFixtures.APP_FEATURE, null, LocalDate.of(2026, 11, 10))}) {
            for (PostCopy copy : new PostCopy[] {copies.es(), copies.en()}) {
                String text = String.join(" ", copy.hook(), copy.caption(), copy.cta(), copy.altText(), String.join(" ", copy.hashtags()),
                        copy.slides().toString());
                assertThat(text).doesNotContain("#vinoargentino", "Contanos", "Registrate", "guardá", "acompañás", "vos", "19:00", "bordó",
                        "argentin", "Argentin");
            }
        }
        assertThat(mock.write(MarketingFixtures.CURIOUS_FACT, null, LocalDate.of(2026, 11, 3)).es().cta()).contains("Cuéntanos");
    }

    @Test
    void theMockCopyCarriesOneSharedEnglishIllustrationSubject() {
        PostCopies copies = mock.write(MarketingFixtures.WINE_DAY, MarketingFixtures.MERLOT, LocalDate.of(2026, 11, 7));
        assertThat(copies.illustration()).isNotBlank().hasSizeLessThanOrEqualTo(PostCopy.ILLUSTRATION_MAX).contains("International Merlot Day");
        assertThat(copies.en().illustration()).isEqualTo(copies.es().illustration());
        assertThat(mock.write(MarketingFixtures.CURIOUS_FACT, null, LocalDate.of(2026, 11, 3)).illustration()).contains("Curious fact");
    }
}
