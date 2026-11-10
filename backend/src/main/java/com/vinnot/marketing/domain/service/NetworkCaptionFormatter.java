package com.vinnot.marketing.domain.service;

import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.SocialNetwork;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * The caption each network publishes for a post (#510 S4), from the copy of one language. The text never carries the
 * hashtags: the network adapter appends the returned hashtags after a blank line, and the limits apply to that whole.
 * <ul>
 * <li>Instagram and Facebook: the caption (ending with the legal line) and its hashtags, at most 2,200 characters and 30
 * hashtags; trailing hashtags go first, the caption and its legal line never.</li>
 * <li>Threads: the hook, the caption shortened on a word with "…" and the legal line, at most 500 characters, and one
 * topic tag (the first hashtag other than {@code #vinnot}, without {@code #}) and no hashtags.</li>
 * <li>TikTok: the hook as the title (at most 90 characters) and the caption with its hashtags as the description, at most
 * 4,000 characters; trailing hashtags go first.</li>
 * </ul>
 */
public final class NetworkCaptionFormatter {
    public static final int FEED_MAX_CHARS = 2_200;
    public static final int FEED_MAX_HASHTAGS = 30;
    public static final int THREADS_MAX_CHARS = 500;
    public static final int TIKTOK_TITLE_MAX = 90;
    public static final int TIKTOK_MAX_CHARS = 4_000;
    private static final String BLANK_LINE = "\n\n";
    private static final String ELLIPSIS = "…";
    private static final String BRAND_TAG = "#vinnot";

    /** One network's caption: its text, a title (TikTok only), the hashtags it carries and one topic tag (Threads only). */
    public record Caption(String text, String title, List<String> hashtags, String topicTag) {
        public Caption {
            Objects.requireNonNull(text, "text");
            hashtags = List.copyOf(hashtags);
        }
    }

    public Caption format(SocialNetwork network, PostCopy copy, PostLanguage language) {
        Objects.requireNonNull(copy, "copy");
        String legal = Objects.requireNonNull(language, "language").legalLine();
        String body = copy.captionWithoutLegalLine();
        return switch (Objects.requireNonNull(network, "network")) {
            case INSTAGRAM, FACEBOOK -> withHashtags(body, legal, copy.hashtags(), FEED_MAX_CHARS, FEED_MAX_HASHTAGS, null);
            case THREADS -> threads(copy.hook(), body, legal, copy.hashtags());
            case TIKTOK -> withHashtags(body, legal, copy.hashtags(), TIKTOK_MAX_CHARS, Integer.MAX_VALUE,
                    shorten(copy.hook(), TIKTOK_TITLE_MAX));
        };
    }

    /**
     * The caption with its legal line as the text, and as many leading hashtags as fit when the network appends them after a
     * blank line; a caption that does not fit alone is shortened on a word, never losing its legal line.
     */
    private static Caption withHashtags(String body, String legal, List<String> hashtags, int maxChars, int maxTags, String title) {
        String caption = paragraphs(body, legal);
        if (caption.length() > maxChars) {
            return new Caption(paragraphs(shorten(body, maxChars - legal.length() - BLANK_LINE.length()), legal), title, List.of(), null);
        }
        List<String> kept = hashtags.subList(0, Math.min(hashtags.size(), maxTags));
        while (!kept.isEmpty() && paragraphs(caption, String.join(" ", kept)).length() > maxChars) {
            kept = kept.subList(0, kept.size() - 1);
        }
        return new Caption(caption, title, kept, null);
    }

    private static Caption threads(String hook, String body, String legal, List<String> hashtags) {
        int room = THREADS_MAX_CHARS - paragraphs(hook, legal).length() - BLANK_LINE.length();
        String topic = hashtags.stream().filter(tag -> !BRAND_TAG.equalsIgnoreCase(tag)).findFirst()
                .map(tag -> tag.replaceFirst("^#", "")).orElse(null);
        return new Caption(paragraphs(hook, shorten(body, room), legal), null, List.of(), topic);
    }

    /**
     * The text within {@code max} characters: whole words followed by "…" when it had to be cut, a hard cut when the first
     * word alone is too long, and nothing when there is no room at all.
     */
    private static String shorten(String text, int max) {
        if (text.length() <= max) {
            return text;
        }
        if (max < 1) {
            return "";
        }
        int end = max - 1;
        int boundary = end;
        while (boundary > 0 && !Character.isWhitespace(text.charAt(boundary))) {
            boundary--;
        }
        return text.substring(0, boundary > 0 ? boundary : end).stripTrailing() + ELLIPSIS;
    }

    /** The non-empty parts separated by blank lines. */
    private static String paragraphs(String... parts) {
        return Arrays.stream(parts).filter(part -> !part.isEmpty()).collect(Collectors.joining(BLANK_LINE));
    }
}
