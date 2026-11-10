package com.vinnot.marketing.domain.model;

import com.vinnot.marketing.domain.exception.InvalidPostCopyException;

import java.util.Arrays;
import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * The copy of a post in each language (#497). Generated copy always holds both; a post stored before #497 holds only its
 * Spanish copy until it is regenerated. The illustration subject is shared, because the hero image is: every copy carries
 * the same one.
 */
public record PostCopies(PostCopy es, PostCopy en) {

    public PostCopies {
        if (Objects.isNull(es) && Objects.isNull(en)) {
            throw new InvalidPostCopyException("copy in at least one language is required");
        }
    }

    /** Copy in a single language. */
    public static PostCopies only(PostLanguage language, PostCopy copy) {
        Objects.requireNonNull(copy, "copy");
        return language == PostLanguage.ES ? new PostCopies(copy, null) : new PostCopies(null, copy);
    }

    /** The copy of a language, or null while it is missing. */
    public PostCopy get(PostLanguage language) {
        return language == PostLanguage.ES ? es : en;
    }

    /** The same copies with this language replaced. */
    public PostCopies with(PostLanguage language, PostCopy copy) {
        Objects.requireNonNull(copy, "copy");
        return language == PostLanguage.ES ? new PostCopies(copy, en) : new PostCopies(es, copy);
    }

    /** Whether every language has copy: only then can a post wait for approval after a generation. */
    public boolean complete() {
        return Objects.nonNull(es) && Objects.nonNull(en);
    }

    /** The languages with copy, in {@link PostLanguage} order. */
    public List<PostLanguage> languages() {
        return Arrays.stream(PostLanguage.values()).filter(language -> Objects.nonNull(get(language))).toList();
    }

    /** The shared illustration subject: the Spanish copy's, else the English one's, else none. */
    public String illustration() {
        return Objects.nonNull(es) && Objects.nonNull(es.illustration()) ? es.illustration()
                : Objects.isNull(en) ? null : en.illustration();
    }

    /** Every present copy with this illustration subject. */
    public PostCopies withIllustration(String subject) {
        return new PostCopies(Objects.isNull(es) ? null : es.withIllustration(subject), Objects.isNull(en) ? null : en.withIllustration(subject));
    }

    /** {@link PostCopy#mediaHash()} of every present language: what each language's slides must show. */
    public Map<PostLanguage, String> mediaHashes() {
        Map<PostLanguage, String> hashes = new EnumMap<>(PostLanguage.class);
        languages().forEach(language -> hashes.put(language, get(language).mediaHash()));
        return Collections.unmodifiableMap(hashes);
    }
}
