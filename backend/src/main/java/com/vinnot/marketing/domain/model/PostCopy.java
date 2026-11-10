package com.vinnot.marketing.domain.model;

import com.vinnot.marketing.domain.exception.InvalidPostCopyException;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/**
 * The text of a post in one language (#489, #497) within the limits the model and the editor share: hook up to 60
 * characters, 3 to 7 slides (title up to 40, body up to 160), caption up to 600 before the legal line, 5 to 10 hashtags
 * including {@code #vinnot}, alt text up to 200 and a call to action. The legal line of the copy's {@link PostLanguage} is
 * appended by {@link #of}, never left to the model. The optional {@code illustration} (#492) is a short English visual
 * subject for the hero image, up to 200 characters; copy stored before it existed has none.
 */
public record PostCopy(String hook, List<Slide> slides, String caption, List<String> hashtags, String altText, String cta,
        String illustration) {
    public static final int HOOK_MAX = 60;
    public static final int SLIDES_MIN = 3;
    public static final int SLIDES_MAX = 7;
    public static final int SLIDE_TITLE_MAX = 40;
    public static final int SLIDE_BODY_MAX = 160;
    public static final int CAPTION_MAX = 600;
    public static final int HASHTAGS_MIN = 5;
    public static final int HASHTAGS_MAX = 10;
    public static final int ALT_TEXT_MAX = 200;
    public static final int CTA_MAX = 200;
    public static final int ILLUSTRATION_MAX = 200;
    private static final String BRAND_TAG = "#vinnot";

    /** One card of the carousel. */
    public record Slide(String title, String body) {
        public Slide {
            title = required(title, "slide title", SLIDE_TITLE_MAX);
            body = required(body, "slide body", SLIDE_BODY_MAX);
        }
    }

    public PostCopy {
        slides = List.copyOf(Objects.requireNonNull(slides, "slides"));
        hashtags = List.copyOf(Objects.requireNonNull(hashtags, "hashtags"));
        illustration = Objects.isNull(illustration) || illustration.isBlank() ? null : illustration.strip();
    }

    /** Copy without an illustration subject. */
    public PostCopy(String hook, List<Slide> slides, String caption, List<String> hashtags, String altText, String cta) {
        this(hook, slides, caption, hashtags, altText, cta, null);
    }

    /** {@link #of(PostLanguage, String, List, String, List, String, String, String)} without an illustration subject. */
    public static PostCopy of(PostLanguage language, String hook, List<Slide> slides, String caption, List<String> hashtags,
            String altText, String cta) {
        return of(language, hook, slides, caption, hashtags, altText, cta, null);
    }

    /**
     * Validates every field, normalises the hashtags and appends the legal line of {@code language}; a legal line the
     * caption already carries is never repeated.
     */
    public static PostCopy of(PostLanguage language, String hook, List<Slide> slides, String caption, List<String> hashtags,
            String altText, String cta, String illustration) {
        Objects.requireNonNull(language, "language");
        String safeHook = required(hook, "hook", HOOK_MAX);
        if (Objects.isNull(slides) || slides.size() < SLIDES_MIN || slides.size() > SLIDES_MAX) {
            throw new InvalidPostCopyException("slides must hold " + SLIDES_MIN + " to " + SLIDES_MAX + " items");
        }
        String body = stripLegalLine(Objects.requireNonNullElse(caption, "")).strip();
        if (body.isEmpty() || body.length() > CAPTION_MAX) {
            throw new InvalidPostCopyException("caption must hold 1 to " + CAPTION_MAX + " characters before the legal line");
        }
        List<String> tags = normaliseHashtags(hashtags);
        String safeAlt = required(altText, "altText", ALT_TEXT_MAX);
        String safeCta = required(cta, "cta", CTA_MAX);
        return new PostCopy(safeHook, slides, body + "\n\n" + language.legalLine(), tags, safeAlt, safeCta, optional(illustration));
    }

    /** The same copy with another illustration subject. */
    public PostCopy withIllustration(String subject) {
        return new PostCopy(hook, slides, caption, hashtags, altText, cta, optional(subject));
    }

    /**
     * SHA-256 (hex) of what the rendered images show: hook, slides, call to action and illustration subject. Caption,
     * hashtags and alt text are not drawn, so editing them keeps the rendered media.
     */
    public String mediaHash() {
        StringBuilder drawn = new StringBuilder();
        field(drawn, hook);
        slides.forEach(slide -> field(field(drawn, slide.title()), slide.body()));
        field(field(drawn, cta), illustration);
        return ContentHash.sha256(drawn.toString().getBytes(StandardCharsets.UTF_8));
    }

    private static StringBuilder field(StringBuilder target, String value) {
        // Length-prefixed, so no two different field lists produce the same text.
        return Objects.isNull(value) ? target.append("-1:") : target.append(value.length()).append(':').append(value);
    }

    private static String optional(String value) {
        if (Objects.isNull(value) || value.isBlank()) {
            return null;
        }
        String trimmed = value.strip();
        if (trimmed.length() > ILLUSTRATION_MAX) {
            throw new InvalidPostCopyException("illustration must hold at most " + ILLUSTRATION_MAX + " characters");
        }
        return trimmed;
    }

    /** The caption as the model or the editor wrote it. */
    public String captionWithoutLegalLine() {
        return stripLegalLine(caption).strip();
    }

    private static String stripLegalLine(String caption) {
        String body = caption;
        for (PostLanguage language : PostLanguage.values()) {
            body = body.replace(language.legalLine(), "");
        }
        return body;
    }

    private static List<String> normaliseHashtags(List<String> hashtags) {
        if (Objects.isNull(hashtags)) {
            throw new InvalidPostCopyException("hashtags must hold " + HASHTAGS_MIN + " to " + HASHTAGS_MAX + " items");
        }
        List<String> tags = hashtags.stream().filter(Objects::nonNull).map(String::strip).filter(tag -> !tag.isEmpty())
                .map(tag -> tag.startsWith("#") ? tag : "#" + tag).distinct().toList();
        if (tags.size() < HASHTAGS_MIN || tags.size() > HASHTAGS_MAX) {
            throw new InvalidPostCopyException("hashtags must hold " + HASHTAGS_MIN + " to " + HASHTAGS_MAX + " items");
        }
        if (tags.stream().noneMatch(tag -> tag.toLowerCase(Locale.ROOT).equals(BRAND_TAG))) {
            throw new InvalidPostCopyException("hashtags must include " + BRAND_TAG);
        }
        return tags;
    }

    private static String required(String value, String field, int max) {
        if (Objects.isNull(value) || value.isBlank()) {
            throw new InvalidPostCopyException(field + " is required");
        }
        String trimmed = value.strip();
        if (trimmed.length() > max) {
            throw new InvalidPostCopyException(field + " must hold at most " + max + " characters");
        }
        return trimmed;
    }
}
