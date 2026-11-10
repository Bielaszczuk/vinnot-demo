package com.vinnot.marketing.application.model;

import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/**
 * What the slide renderer draws for one post in one language (#492, #497): a cover with the hook and the hero
 * illustration, one card per copy slide and a closing card with the call to action and the language's legal line.
 * {@code illustrationPng} is optional: without it the cover uses one of the vignettes of {@code pillarCode}, picked by
 * {@code artSeed} so posts of one pillar do not all look alike (#510). {@code language} is the {@link PostLanguage} code.
 */
public record SlideDeck(String hook, List<PostCopy.Slide> slides, String cta, String legalLine, byte[] illustrationPng,
        String pillarCode, String language, int artSeed) {

    public SlideDeck {
        hook = required(hook, "hook");
        slides = List.copyOf(Objects.requireNonNull(slides, "slides"));
        if (slides.isEmpty()) {
            throw new IllegalArgumentException("slides must hold at least one item");
        }
        cta = required(cta, "cta");
        legalLine = required(legalLine, "legalLine");
        illustrationPng = Objects.isNull(illustrationPng) ? null : illustrationPng.clone();
        pillarCode = required(pillarCode, "pillarCode");
        language = required(language, "language");
    }

    /** A deck whose vignette is the pillar's first one. */
    public SlideDeck(String hook, List<PostCopy.Slide> slides, String cta, String legalLine, byte[] illustrationPng, String pillarCode,
            String language) {
        this(hook, slides, cta, legalLine, illustrationPng, pillarCode, language, 0);
    }

    /** A deck for a post's copy in one language, with that language's legal line. */
    public static SlideDeck of(PostCopy copy, byte[] illustrationPng, String pillarCode, PostLanguage language) {
        return of(copy, illustrationPng, pillarCode, language, 0);
    }

    /** The same deck, with the seed that picks the pillar vignette when there is no illustration. */
    public static SlideDeck of(PostCopy copy, byte[] illustrationPng, String pillarCode, PostLanguage language, int artSeed) {
        Objects.requireNonNull(copy, "copy");
        Objects.requireNonNull(language, "language");
        return new SlideDeck(copy.hook(), copy.slides(), copy.cta(), language.legalLine(), illustrationPng, pillarCode, language.code(),
                artSeed);
    }

    @Override
    public byte[] illustrationPng() {
        return Objects.isNull(illustrationPng) ? null : illustrationPng.clone();
    }

    public boolean hasIllustration() {
        return Objects.nonNull(illustrationPng) && illustrationPng.length > 0;
    }

    /** Cover, one card per slide and the closing card. */
    public int slideCount() {
        return slides.size() + 2;
    }

    @Override
    public boolean equals(Object other) {
        return other instanceof SlideDeck deck && hook.equals(deck.hook) && slides.equals(deck.slides) && cta.equals(deck.cta)
                && legalLine.equals(deck.legalLine) && Arrays.equals(illustrationPng, deck.illustrationPng)
                && pillarCode.equals(deck.pillarCode) && language.equals(deck.language);
    }

    @Override
    public int hashCode() {
        return Objects.hash(hook, slides, cta, legalLine, Arrays.hashCode(illustrationPng), pillarCode, language);
    }

    @Override
    public String toString() {
        return "SlideDeck[hook=" + hook + ", slides=" + slides.size() + ", illustrationBytes="
                + (Objects.isNull(illustrationPng) ? 0 : illustrationPng.length) + ", pillarCode=" + pillarCode
                + ", language=" + language + "]";
    }

    private static String required(String value, String field) {
        if (Objects.isNull(value) || value.isBlank()) {
            throw new IllegalArgumentException(field + " is required");
        }
        return value.strip();
    }
}
