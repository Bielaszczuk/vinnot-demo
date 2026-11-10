package com.vinnot.marketing.application.service;

import com.vinnot.marketing.domain.model.ContentPillar;
import com.vinnot.marketing.domain.model.DateRule;
import com.vinnot.marketing.domain.model.FactCheck;
import com.vinnot.marketing.domain.model.GenerationInfo;
import com.vinnot.marketing.domain.model.PostCopies;
import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.WineDay;
import com.vinnot.marketing.domain.model.WineDayKind;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Shared sample data for the marketing application tests. */
final class MarketingFixtures {
    static final Instant NOW = Instant.parse("2026-11-02T12:00:00Z");
    static final Instant TUESDAY_SLOT = Instant.parse("2026-11-03T22:00:00Z");
    static final Instant SATURDAY_SLOT = Instant.parse("2026-11-07T22:00:00Z");
    static final ContentPillar WINE_DAY = new ContentPillar("WINE_DAY", "Día del vino", "Wine day", 3, "Celebra el día.",
            "Celebrate the day.", 1);
    static final ContentPillar CURIOUS_FACT = new ContentPillar("CURIOUS_FACT", "Dato curioso", "Curious fact", 2, "N datos sobre X.",
            "N facts about X.", 2);
    static final ContentPillar EDUCATION = new ContentPillar("EDUCATION", "Educación", "Education", 2, "Un concepto del vino.",
            "One wine concept.", 3);
    static final ContentPillar APP_FEATURE = new ContentPillar("APP_FEATURE", "Función de la app", "App feature", 1,
            "Muestra una función.", "Show one feature.", 9);
    static final List<ContentPillar> PILLARS = List.of(WINE_DAY, CURIOUS_FACT, EDUCATION, APP_FEATURE);
    static final WineDay MERLOT = new WineDay("MERLOT", "Día Internacional del Merlot", "International Merlot Day", WineDayKind.GRAPE,
            DateRule.parse("fixed:11-07"), 1, null);
    static final List<String> TAGS = List.of("#vinnot", "#merlot", "#vino", "#tinto", "#copa");
    static final List<String> TAGS_EN = List.of("#vinnot", "#merlot", "#wine", "#redwine", "#glass");
    static final PostCopy COPY = PostCopy.of(PostLanguage.ES, "Merlot, el tinto amable", List.of(new PostCopy.Slide("Suave",
                    "Taninos redondos."), new PostCopy.Slide("Origen", "Burdeos, siglo XVIII."), new PostCopy.Slide("Hoy", "Brinda con uno.")),
            "Hoy es el día del Merlot.", TAGS, "Copa de vino tinto sobre una mesa", "¿Cuál fue tu primer Merlot?");
    static final PostCopy COPY_EN = PostCopy.of(PostLanguage.EN, "Merlot, the gentle red", List.of(new PostCopy.Slide("Smooth",
                    "Round tannins."), new PostCopy.Slide("Origin", "Bordeaux, 18th century."), new PostCopy.Slide("Today", "Raise a glass.")),
            "Today is Merlot day.", TAGS_EN, "A glass of red wine on a table", "What was your first Merlot?");
    static final PostCopies COPIES = new PostCopies(COPY, COPY_EN);
    static final GenerationInfo GENERATED = GenerationInfo.none().succeeded("openai", "gpt-4o-mini", false, FactCheck.PASSED, List.of(), NOW);

    private MarketingFixtures() { }

    static SocialPost draft(Instant slot, String pillar, String wineDay) {
        return SocialPost.planned(UUID.randomUUID(), slot, pillar, wineDay, NOW);
    }

    static SocialPost pending(Instant slot, String pillar, String wineDay) {
        SocialPost post = draft(slot, pillar, wineDay);
        post.copyGenerated(COPIES, GENERATED, NOW);
        return post;
    }
}
