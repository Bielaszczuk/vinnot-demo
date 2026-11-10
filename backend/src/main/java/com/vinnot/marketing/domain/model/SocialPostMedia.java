package com.vinnot.marketing.domain.model;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * The rendered images of a post (#492): one hero illustration shared by every language and, per language (#497), the
 * carousel slides in both formats. The media targets one copy hash per language and one illustration version; while a
 * render for that target is pending, the previous illustration and slides stay until the new ones are ready. Each
 * language's slides are current only for that language's copy hash, so editing one language re-renders only that one.
 *
 * @param status              whether every targeted language is rendered, waiting or failed
 * @param copyHashes          {@link PostCopy#mediaHash()} of each language's copy the media is (being) rendered for
 * @param illustrationVersion bumped by every "new illustration" request
 * @param attempts            render attempts for the current target
 * @param error               last render error, kept while it is retried and when it failed
 * @param illustration        the latest illustration, possibly of an older version
 * @param slides              the latest rendered slides of each language, possibly for older copy
 */
public record SocialPostMedia(Status status, Map<PostLanguage, String> copyHashes, int illustrationVersion, int attempts, String error,
        Illustration illustration, Map<PostLanguage, Slides> slides, Instant updatedAt) {

    public enum Status { PENDING, READY, FAILED }

    /** Where the illustration came from: the image model, or the bundled pillar vignette. */
    public enum Source { AI, FALLBACK }

    /** One stored image: its storage key and public URL. */
    public record Image(String key, String url) {
        public Image {
            if (Objects.isNull(key) || key.isBlank() || Objects.isNull(url) || url.isBlank()) {
                throw new IllegalArgumentException("A stored image needs a key and a URL");
            }
        }
    }

    /** The hero of one illustration version; a fallback has no stored image and keeps why the model was not used. */
    public record Illustration(int version, String subject, Source source, Image image, String reason) {
        public Illustration {
            Objects.requireNonNull(subject, "subject");
            Objects.requireNonNull(source, "source");
            if (source == Source.AI && Objects.isNull(image)) {
                throw new IllegalArgumentException("An AI illustration needs its stored image");
            }
        }

        public static Illustration ai(int version, String subject, Image image) {
            return new Illustration(version, subject, Source.AI, image, null);
        }

        public static Illustration fallback(int version, String subject, String reason) {
            return new Illustration(version, subject, Source.FALLBACK, null, reason);
        }
    }

    /** The carousel images of one language's render, in deck order, per format. */
    public record Slides(String copyHash, int illustrationVersion, List<Image> instagram, List<Image> tiktok, Instant renderedAt) {
        public Slides {
            Objects.requireNonNull(copyHash, "copyHash");
            instagram = List.copyOf(instagram);
            tiktok = List.copyOf(tiktok);
        }

        boolean renders(String hash, int version) {
            return copyHash.equals(hash) && illustrationVersion == version;
        }
    }

    /** The stored images of one language's new render, in deck order, per format. */
    public record SlideImages(List<Image> instagram, List<Image> tiktok) {
        public SlideImages {
            instagram = List.copyOf(instagram);
            tiktok = List.copyOf(tiktok);
        }
    }

    public SocialPostMedia {
        Objects.requireNonNull(status, "status");
        copyHashes = byLanguage(Objects.requireNonNull(copyHashes, "copyHashes"));
        if (copyHashes.isEmpty()) {
            throw new IllegalArgumentException("The media targets the copy of at least one language");
        }
        slides = byLanguage(Objects.requireNonNullElse(slides, Map.of()));
        if (illustrationVersion < 0 || attempts < 0) {
            throw new IllegalArgumentException("Illustration version and attempts cannot be negative");
        }
    }

    /** Nothing rendered yet for this target. */
    public static SocialPostMedia pending(Map<PostLanguage, String> copyHashes, int illustrationVersion, Instant now) {
        return new SocialPostMedia(Status.PENDING, copyHashes, illustrationVersion, 0, null, null, Map.of(), now);
    }

    /**
     * The copy changed: render the languages whose copy hash moved, unless their slides already show exactly that copy.
     * Unchanged copy keeps everything.
     */
    public SocialPostMedia forCopy(Map<PostLanguage, String> hashes, Instant now) {
        return copyHashes.equals(hashes) ? this : target(hashes, illustrationVersion, now);
    }

    /** The admin asked for a new illustration: a new version, every language rendered again. */
    public SocialPostMedia newIllustration(Instant now) {
        return target(copyHashes, illustrationVersion + 1, now);
    }

    private SocialPostMedia target(Map<PostLanguage, String> hashes, int version, Instant now) {
        Status next = allRendered(hashes, version, slides) ? Status.READY : Status.PENDING;
        return new SocialPostMedia(next, hashes, version, 0, null, illustration, slides, now);
    }

    public SocialPostMedia attempted(Instant now) {
        return new SocialPostMedia(status, copyHashes, illustrationVersion, attempts + 1, error, illustration, slides, now);
    }

    /** A retryable failure: still pending, with the reason for the admin. */
    public SocialPostMedia retrying(String reason, Instant now) {
        return new SocialPostMedia(Status.PENDING, copyHashes, illustrationVersion, attempts, reason, illustration, slides, now);
    }

    public SocialPostMedia failed(String reason, Instant now) {
        return new SocialPostMedia(Status.FAILED, copyHashes, illustrationVersion, attempts, reason, illustration, slides, now);
    }

    public SocialPostMedia withIllustration(Illustration next, Instant now) {
        return new SocialPostMedia(status, copyHashes, illustrationVersion, attempts, error, Objects.requireNonNull(next, "illustration"),
                slides, now);
    }

    /** The targeted languages whose slides do not show their copy with the current illustration version, in language order. */
    public List<PostLanguage> staleLanguages() {
        return Arrays.stream(PostLanguage.values()).filter(copyHashes::containsKey)
                .filter(language -> !rendersTarget(language, copyHashes.get(language), illustrationVersion, slides)).toList();
    }

    /**
     * The slides of these languages are stored for the current target and replace their previous ones; the media is ready
     * once every targeted language shows its copy.
     */
    public SocialPostMedia rendered(Map<PostLanguage, SlideImages> images, Instant now) {
        Map<PostLanguage, Slides> next = new EnumMap<>(PostLanguage.class);
        next.putAll(slides);
        images.forEach((language, set) -> {
            String hash = copyHashes.get(language);
            if (Objects.isNull(hash)) {
                throw new IllegalArgumentException("The media does not target the " + language.code() + " copy");
            }
            next.put(language, new Slides(hash, illustrationVersion, set.instagram(), set.tiktok(), now));
        });
        Status rendered = allRendered(copyHashes, illustrationVersion, next) ? Status.READY : Status.PENDING;
        return new SocialPostMedia(rendered, copyHashes, illustrationVersion, attempts, null, illustration, next, now);
    }

    /** The illustration of the current version for this subject, if one was already produced. */
    public Illustration reusableIllustration(String subject) {
        return Objects.nonNull(illustration) && illustration.version() == illustrationVersion && illustration.subject().equals(subject)
                ? illustration : null;
    }

    /** A language's slides when they show its current copy; stale slides, or a language without copy, have none. */
    public Slides currentSlides(PostLanguage language) {
        Slides current = slides.get(language);
        return Objects.nonNull(current) && current.copyHash().equals(copyHashes.get(language)) ? current : null;
    }

    /** One fingerprint of the whole target (every language's copy hash), for deduplicating render requests. */
    public String targetHash() {
        StringBuilder target = new StringBuilder();
        copyHashes.forEach((language, hash) -> target.append(language.code()).append('=').append(hash).append(';'));
        return ContentHash.sha256(target.toString().getBytes(StandardCharsets.UTF_8));
    }

    /** Every storage key this media references. */
    public List<String> keys() {
        List<String> keys = new ArrayList<>();
        if (Objects.nonNull(illustration) && Objects.nonNull(illustration.image())) {
            keys.add(illustration.image().key());
        }
        slides.values().forEach(set -> {
            set.instagram().forEach(image -> keys.add(image.key()));
            set.tiktok().forEach(image -> keys.add(image.key()));
        });
        return keys;
    }

    private static boolean allRendered(Map<PostLanguage, String> hashes, int version, Map<PostLanguage, Slides> rendered) {
        return hashes.entrySet().stream().allMatch(entry -> rendersTarget(entry.getKey(), entry.getValue(), version, rendered));
    }

    private static boolean rendersTarget(PostLanguage language, String hash, int version, Map<PostLanguage, Slides> rendered) {
        Slides set = rendered.get(language);
        return Objects.nonNull(set) && set.renders(hash, version);
    }

    private static <T> Map<PostLanguage, T> byLanguage(Map<PostLanguage, T> values) {
        Map<PostLanguage, T> copy = new EnumMap<>(PostLanguage.class);
        values.forEach((language, value) -> copy.put(Objects.requireNonNull(language, "language"), Objects.requireNonNull(value, "value")));
        return Collections.unmodifiableMap(copy);
    }
}
