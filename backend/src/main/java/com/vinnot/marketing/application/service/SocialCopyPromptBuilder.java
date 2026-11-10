package com.vinnot.marketing.application.service;

import com.vinnot.marketing.domain.model.ContentPillar;
import com.vinnot.marketing.domain.model.PostCopies;
import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.WineDay;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Objects;

/**
 * The prompts of the copy generation (#489, #497). One completion writes the post in neutral Spanish and in English, so
 * both state the same facts; the instructions are in English: the Vinnot voice, what each post must carry, how pairings
 * are written, the pillar's brief, the wine day when there is one, and the JSON contract with the limits {@link PostCopy}
 * enforces. The legal lines are never requested: the domain appends them. The fact check reads both languages at once. A
 * rewrite repeats the copy prompt with the reason the previous answer was rejected (#501).
 */
@Service
public class SocialCopyPromptBuilder {
    static final String VOICE = "Voice: a knowledgeable sommelier writing for curious wine lovers around the world: refined, precise "
            + "and warm, never snobbish and never coarse. Technical terms (malolactic fermentation, lees ageing, tannin structure, "
            + "terroir, clones) are used precisely and explained in a few words.";
    static final String LANGUAGES = "Write the post twice, with the same facts: \"es\" in neutral Spanish that reads naturally in any "
            + "Spanish-speaking country, addressing the reader as \"tú\" (no voseo, no regional slang, no local idioms), and \"en\" in "
            + "natural, idiomatic English for an international audience (an adaptation, not a word-for-word translation).";
    static final String FRAMING = "Vinnot is a global app to discover, save and compare wines; it is not described as Argentine. Do "
            + "not frame the post around Argentina or any single country unless the topic itself comes from there (for example the "
            + "origin of Malbec World Day, or Torrontés). Do not state a publishing time, a time of day or a local time zone.";
    static final String SUBSTANCE = "Substance: every post carries concrete, verifiable facts and curiosities: origin and history, "
            + "main regions around the world, grape and style traits (body, acidity, tannin, aromatics), winemaking choices and how "
            + "they show in the glass, ageing potential. No filler, and no jokes at the expense of wine culture. Only facts you are "
            + "sure of: if you are not certain of a number, a date or an origin, leave it out.";
    static final String DEPTH = "Depth: write for curious, already interested wine lovers. Every post teaches at least one non-obvious "
            + "insight that a casual wine drinker would not know, backed by a specific name (a producer, an appellation, a grape, a "
            + "person, a rule), a date or a figure. Treat one topic in depth instead of a superficial overview. Never use clichés "
            + "or empty phrases such as \"el vino es cultura\", \"ideal para compartir\", \"perfecto para cualquier ocasión\" or "
            + "\"wine brings people together\", and leave out local folklore and street food: a country's wines, grapes, days "
            + "and history are welcome, its local dishes and customs are not the subject.";
    static final String PAIRINGS = "Pairings: only by food category, with refined examples, explained by structure (fat, acidity, "
            + "tannin, salt). In Spanish name them like \"quesos de pasta dura y madurados (parmesano, pecorino)\", \"quesos semiduros "
            + "de tenor graso medio (fontina, gruyère)\", \"carnes rojas\", \"carnes blancas\", \"pescados grasos\", \"hongos y verduras "
            + "asadas\"; in English like \"hard aged cheeses (Parmesan, Pecorino)\", \"semi-hard cheeses of medium fat (Fontina, "
            + "Gruyère)\", \"red meat\", \"white meat\", \"oily fish\", \"mushrooms and roasted vegetables\". Never street food or fast "
            + "food (pizza, empanadas, choripán, hamburguesas, alfajores, helado) and never a single home dish.";
    static final String LIMITS = "Every character limit below is a hard limit, counted in characters with spaces, in each "
            + "language: an answer with one field over its limit is discarded. Spanish runs longer than English, so keep each "
            + "slide body to one or two short sentences (at most 22 words) and check the Spanish fields first. The closing "
            + "question or call goes in \"cta\", never at the end of the caption, and every COPY has every field.";
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEEE d MMMM yyyy", Locale.ENGLISH);

    public String copyPrompt(ContentPillar pillar, WineDay wineDay, LocalDate date) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You write the Instagram and TikTok carousel posts of Vinnot.\n")
                .append(VOICE).append('\n').append(LANGUAGES).append('\n').append(FRAMING).append('\n')
                .append(SUBSTANCE).append('\n').append(DEPTH).append('\n').append(PAIRINGS).append("\n\n")
                .append("The post goes out on ").append(DAY.format(date)).append(".\n")
                .append("Content pillar: ").append(pillar.nameEn()).append(" (").append(pillar.nameEs()).append(").\n")
                .append(pillar.briefEn()).append('\n');
        if (Objects.nonNull(wineDay)) {
            prompt.append("That day is ").append(wineDay.nameEn()).append(" (in Spanish: ").append(wineDay.nameEs()).append(")");
            if (Objects.nonNull(wineDay.countryCode())) {
                prompt.append(", from ").append(wineDay.countryCode());
            }
            prompt.append(": the post is about that day. Explain why the day exists and add at least two concrete facts.\n");
        }
        prompt.append("\nFormats you may use when they fit the pillar: a quiz with options A, B, C and D; \"N facts about X\"; a pairing ")
                .append("by food category; a short story built around one number; a wine term explained precisely.\n");
        if (ContentPillar.APP_FEATURE.equals(pillar.code())) {
            prompt.append("Show the app feature as the answer to a real need; the \"cta\" is a call to sign up at vinnot.com/share.\n");
        } else {
            prompt.append("Do not mention the app or any link; the \"cta\" is a question readers can answer in the comments.\n");
        }
        prompt.append("Do not include any legal notice about drinking alcohol: we add it ourselves.\n")
                .append(LIMITS).append("\n\n")
                .append("Reply with valid JSON only, no text around it, in exactly this shape:\n")
                .append("{\n")
                .append("  \"es\": COPY,  // the post in neutral Spanish\n")
                .append("  \"en\": COPY,  // the same post in English\n")
                .append("  \"illustration\": \"in English, up to ").append(PostCopy.ILLUSTRATION_MAX)
                .append(" characters: the visual subject of the cover illustration (an object or a wine scene), with no text ")
                .append("and no people\"\n")
                .append("}\n")
                .append("where each COPY is:\n")
                .append("{\n")
                .append("  \"hook\": \"first line of the cover, up to ").append(PostCopy.HOOK_MAX).append(" characters\",\n")
                .append("  \"cta\": \"required in both languages, never empty, up to ").append(PostCopy.CTA_MAX)
                .append(" characters: the closing question for the comments (for the app feature, the call to sign up)\",\n")
                .append("  \"slides\": [{\"title\": \"up to ").append(PostCopy.SLIDE_TITLE_MAX).append(" characters\", \"body\": \"up to ")
                .append(PostCopy.SLIDE_BODY_MAX).append(" characters, at most 22 words\"}],  // ").append(PostCopy.SLIDES_MIN).append(" to ")
                .append(PostCopy.SLIDES_MAX).append(" slides\n")
                .append("  \"caption\": \"the post text, up to ").append(PostCopy.CAPTION_MAX).append(" characters\",\n")
                .append("  \"hashtags\": [\"#vinnot\", \"...\"],  // ").append(PostCopy.HASHTAGS_MIN).append(" to ")
                .append(PostCopy.HASHTAGS_MAX).append(", always with #vinnot; Spanish and English hashtags may differ\n")
                .append("  \"altText\": \"image description for accessibility, up to ").append(PostCopy.ALT_TEXT_MAX)
                .append(" characters\"\n")
                .append("}\n");
        return prompt.toString();
    }

    /** The copy prompt again, with the reason the previous answer was rejected. */
    public String rewritePrompt(String copyPrompt, String rejection) {
        return copyPrompt + "\nYour previous answer was rejected: " + rejection + ". Write the whole answer again, in the same "
                + "JSON shape, with every field within its limit.\n";
    }

    public String factCheckPrompt(PostCopies copies) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("Fact-check this wine post, written in Spanish and in English. Flag only a factual claim that is clearly false ")
                .append("or invented (dates, numbers, origins, grapes, regions, winemaking), or a fact one language states and the ")
                .append("other contradicts; tone and opinions do not count.\n");
        for (PostLanguage language : copies.languages()) {
            PostCopy copy = copies.get(language);
            prompt.append("\n[").append(language.code()).append("]\nHook: ").append(copy.hook()).append('\n');
            for (PostCopy.Slide slide : copy.slides()) {
                prompt.append("Slide: ").append(slide.title()).append(" — ").append(slide.body()).append('\n');
            }
            prompt.append("Caption: ").append(copy.captionWithoutLegalLine()).append('\n');
        }
        prompt.append("\nReply with valid JSON only: {\"ok\": true or false, \"issues\": [\"each problem in one sentence, in Spanish\"]}.\n");
        return prompt.toString();
    }
}
