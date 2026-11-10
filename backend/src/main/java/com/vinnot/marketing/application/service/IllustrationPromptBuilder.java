package com.vinnot.marketing.application.service;

import com.vinnot.marketing.domain.model.ContentPillar;
import com.vinnot.marketing.domain.model.PostCopies;
import com.vinnot.marketing.domain.model.WineDay;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Objects;

/**
 * The hero illustration prompt (#492): the owner's watercolor recipe, the subject and the rules that keep the image usable
 * on a cover (transparent background, no text, no people). The subject is the copy's shared one (the hero serves every
 * language, #497), else one derived from the wine day or the pillar.
 */
@Service
public class IllustrationPromptBuilder {
    static final String STYLE = "detailed hand-painted watercolor, fine sepia ink linework, warm sepia, cream, aged oak, olive and "
            + "soft wine red palette, paper grain, warm light, elegant premium editorial feel";
    static final String RULES = "fully transparent background, no text, no letters, no numbers, no logos, no faces, no people";
    static final String DEFAULT_SUBJECT = "a glass of red wine beside an unlabeled bottle and a bunch of grapes";
    private static final Map<String, String> PILLAR_SUBJECTS = Map.of(
            ContentPillar.WINE_DAY, "two wine glasses raised in a toast beside an unlabeled bottle and a bunch of grapes",
            "CURIOUS_FACT", "an open antique book with a magnifying glass, a glass of red wine and a few grapes",
            "EDUCATION", "a wine glass with a swirl of red wine, a corkscrew and a cork on a small oak board",
            "MYTH_VS_REALITY", "two wine glasses side by side, one with red wine and one with white wine, with a few grapes",
            "QUIZ", "a wine glass surrounded by four small bunches of grapes of different colors",
            "PAIRING", "a glass of red wine beside a small board of aged hard cheese wedges, a few walnuts and a sprig of thyme",
            "GRAPE_OF_MONTH", "a large bunch of ripe grapes hanging from a vine with leaves",
            "HUMOR", "a cheerful wine bottle with its cork popping out and a splash of wine",
            ContentPillar.APP_FEATURE, "a glass of red wine beside an open notebook with a pencil and a few grapes");

    /** What the hero shows. */
    public String subject(PostCopies copies, String pillarCode, WineDay wineDay) {
        if (Objects.nonNull(copies.illustration())) {
            return copies.illustration();
        }
        if (Objects.nonNull(wineDay)) {
            return "a still life evoking " + wineDay.nameEn() + ": a wine glass, an unlabeled bottle and fresh grapes";
        }
        return PILLAR_SUBJECTS.getOrDefault(pillarCode, DEFAULT_SUBJECT);
    }

    /** The image prompt for one subject; the reference images carry the house style. */
    public String prompt(String subject) {
        return "Paint a single illustration of " + subject + ".\n"
                + "Style: " + STYLE + ", matching the attached reference illustrations.\n"
                + "Composition: one centered subject for a social media cover, with generous empty space around it so text "
                + "can sit above and below.\n"
                + "Requirements: " + RULES + ".";
    }
}
