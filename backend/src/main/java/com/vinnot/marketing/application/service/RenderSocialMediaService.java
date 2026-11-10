package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.RenderedSlide;
import com.vinnot.marketing.application.model.SlideDeck;
import com.vinnot.marketing.application.model.SlideFormat;
import com.vinnot.marketing.application.port.in.RenderSocialMediaUseCase;
import com.vinnot.marketing.application.port.out.SlideRenderer;
import com.vinnot.marketing.application.port.out.SlideRenderer.SlideRenderingException;
import com.vinnot.marketing.application.port.out.SocialMediaRenderQueue;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.application.port.out.StyleReferenceCatalog;
import com.vinnot.marketing.application.port.out.WineDayCatalog;
import com.vinnot.marketing.domain.model.ContentHash;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostMedia;
import com.vinnot.marketing.domain.model.WineDay;
import com.vinnot.shared.application.exception.AiImageGenerationException;
import com.vinnot.shared.application.port.AiImageService;
import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.shared.application.port.ImageEditRequest;
import com.vinnot.shared.application.port.ReferenceImage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Renders a post's media (#492). The hero is painted by the image model in the house style, or reused while the
 * illustration version and subject are unchanged; every image failure falls back to the pillar vignette, so a post never
 * stays without images because of the illustration. The hero is shared; the slides are rendered per language (#497), and
 * only for the languages whose slides do not show their current copy, so editing one language re-renders only that one.
 * Both formats are stored under content-addressed keys with the language segment
 * ({@code posts/{id}/{lang}/{format}-NN-{hash}.jpg}), then the media is marked ready and the images it replaced are
 * handed to storage cleanup. Every write is a
 * compare-and-set against what this run last wrote: when the copy or the illustration version changes meanwhile, the run
 * stops and the newer request renders instead.
 */
@Service
@RequiredArgsConstructor
public class RenderSocialMediaService implements RenderSocialMediaUseCase {
    static final int MAX_ATTEMPTS = 5;
    static final int PENDING_BATCH = 50;
    static final String ATTEMPTS_EXHAUSTED = "RENDER_ATTEMPTS_EXHAUSTED";
    static final String HERO_STORE_FAILED = "HERO_STORE_FAILED";
    private static final Logger LOGGER = LoggerFactory.getLogger(RenderSocialMediaService.class);
    private static final int KEY_HASH_LENGTH = 16;
    private final SocialPostRepository posts;
    private final WineDayCatalog wineDays;
    private final AiImageService images;
    private final StyleReferenceCatalog styleReferences;
    private final SlideRenderer renderer;
    private final FileStoragePort storage;
    private final SocialMediaRenderQueue queue;
    private final IllustrationPromptBuilder prompts;

    @Override
    public void render(UUID postId, Instant now) {
        Optional<SocialPost> found = posts.findById(postId);
        if (found.isEmpty()) {
            return;
        }
        SocialPost post = found.get();
        SocialPostMedia stored = post.media();
        if (!post.prepareMedia(now) || post.media().status() != SocialPostMedia.Status.PENDING) {
            return;
        }
        Run run = new Run(post, stored, now);
        if (post.media().attempts() >= MAX_ATTEMPTS) {
            run.write(post.media().failed(ATTEMPTS_EXHAUSTED, now));
            return;
        }
        if (!run.write(post.media().attempted(now))) {
            return;
        }
        try {
            run.execute();
        } catch (SlideRenderingException exception) {
            if (exception.reason().retryable()) {
                run.write(run.media.retrying(exception.reason().name(), now));
                throw exception;
            }
            LOGGER.warn("Social media render failed for post {}: {}", postId, exception.getMessage());
            run.write(run.media.failed(exception.reason().name(), now));
        } catch (RuntimeException exception) {
            run.write(run.media.retrying(exception.getClass().getSimpleName(), now));
            throw exception;
        }
    }

    @Override
    public int requestPending(Instant now) {
        int requested = 0;
        for (SocialPost post : posts.findAwaitingMedia(now, PENDING_BATCH)) {
            if (post.prepareMedia(now)) {
                queue.requestFor(post);
                requested++;
            }
        }
        return requested;
    }

    /** One render of one post: the media as this run last wrote it, and the steps that move it forward. */
    private final class Run {
        private final SocialPost post;
        private final Instant now;
        private SocialPostMedia media;

        private Run(SocialPost post, SocialPostMedia stored, Instant now) {
            this.post = post;
            this.media = stored;
            this.now = now;
        }

        /** Compare-and-set; false when the media changed under this run, which then stops. */
        private boolean write(SocialPostMedia next) {
            if (!posts.saveMedia(post.id(), media, next)) {
                LOGGER.info("Media of social post {} changed during its render; the newer request renders it", post.id());
                return false;
            }
            media = next;
            return true;
        }

        private void execute() {
            String subject = prompts.subject(post.copies(), post.pillarCode(), wineDay());
            Hero hero = hero(subject);
            if (Objects.isNull(hero)) {
                return;
            }
            List<PostLanguage> languages = media.staleLanguages();
            Map<PostLanguage, Rendered> rendered;
            try {
                rendered = renderAll(languages, hero.png());
            } catch (SlideRenderingException exception) {
                if (exception.reason() != SlideRenderer.Reason.INVALID_ILLUSTRATION || Objects.isNull(hero.png())) {
                    throw exception;
                }
                LOGGER.warn("The illustration of social post {} cannot be drawn; using the pillar vignette", post.id());
                if (!replaceIllustration(SocialPostMedia.Illustration.fallback(media.illustrationVersion(), subject,
                        exception.reason().name()))) {
                    return;
                }
                rendered = renderAll(languages, null);
            }
            Map<PostLanguage, SocialPostMedia.SlideImages> stored = new EnumMap<>(PostLanguage.class);
            rendered.forEach((language, slides) -> stored.put(language, new SocialPostMedia.SlideImages(
                    store(language, SlideFormat.INSTAGRAM, slides.instagram()), store(language, SlideFormat.TIKTOK, slides.tiktok()))));
            SocialPostMedia previous = media;
            if (write(media.rendered(stored, now))) {
                Set<String> kept = new HashSet<>(media.keys());
                previous.keys().stream().filter(key -> !kept.contains(key)).forEach(storage::deleteSocialMedia);
            }
        }

        /** The hero to draw (without PNG for the vignette fallback), or null when the run lost its media. */
        private Hero hero(String subject) {
            SocialPostMedia.Illustration reusable = media.reusableIllustration(subject);
            if (Objects.nonNull(reusable)) {
                if (reusable.source() == SocialPostMedia.Source.FALLBACK) {
                    return new Hero(null);
                }
                Optional<byte[]> png = load(reusable.image().key());
                if (png.isPresent()) {
                    return new Hero(png.get());
                }
            }
            int version = media.illustrationVersion();
            byte[] png;
            try {
                png = paint(subject);
            } catch (AiImageGenerationException exception) {
                LOGGER.info("Social post {} uses its pillar vignette: {}", post.id(), exception.getMessage());
                return replaceIllustration(SocialPostMedia.Illustration.fallback(version, subject, exception.getCode()))
                        ? new Hero(null) : null;
            }
            String key = "posts/%s/hero-%s.png".formatted(post.id(), shortHash(png));
            String url;
            try {
                url = storage.storeSocialMedia(key, png, "image/png");
            } catch (RuntimeException exception) {
                // The painting is already paid: record the vignette for this version so a retry never pays again.
                LOGGER.warn("The hero of social post {} cannot be stored; using the pillar vignette: {}", post.id(),
                        exception.getMessage());
                return replaceIllustration(SocialPostMedia.Illustration.fallback(version, subject, HERO_STORE_FAILED))
                        ? new Hero(null) : null;
            }
            return replaceIllustration(SocialPostMedia.Illustration.ai(version, subject, new SocialPostMedia.Image(key, url)))
                    ? new Hero(png) : null;
        }

        private byte[] paint(String subject) {
            if (!images.isAvailable()) {
                throw AiImageGenerationException.unavailable("AI images are not available", null);
            }
            List<ReferenceImage> references = styleReferences.references();
            if (references.isEmpty()) {
                throw AiImageGenerationException.unavailable("No style reference could be loaded", null);
            }
            return images.edit(new ImageEditRequest(prompts.prompt(subject), references, null, true)).png();
        }

        private boolean replaceIllustration(SocialPostMedia.Illustration next) {
            SocialPostMedia.Illustration previous = media.illustration();
            if (!write(media.withIllustration(next, now))) {
                return false;
            }
            if (Objects.nonNull(previous) && Objects.nonNull(previous.image())
                    && (Objects.isNull(next.image()) || !previous.image().key().equals(next.image().key()))) {
                storage.deleteSocialMedia(previous.image().key());
            }
            return true;
        }

        private Optional<byte[]> load(String key) {
            try {
                Optional<FileStoragePort.StoredFile> file = storage.loadSocialMedia(key);
                if (file.isEmpty()) {
                    return Optional.empty();
                }
                try (InputStream content = file.get().content()) {
                    return Optional.of(content.readAllBytes());
                }
            } catch (IOException | RuntimeException exception) {
                LOGGER.warn("Stored hero {} of social post {} is unreadable; painting it again", key, post.id());
                return Optional.empty();
            }
        }

        /** Both formats of every given language, drawn with this hero (null for the vignette). */
        private Map<PostLanguage, Rendered> renderAll(List<PostLanguage> languages, byte[] illustration) {
            Map<PostLanguage, Rendered> rendered = new EnumMap<>(PostLanguage.class);
            for (PostLanguage language : languages) {
                SlideDeck deck = SlideDeck.of(post.copies().get(language), illustration, post.pillarCode(), language, artSeed());
                rendered.put(language, new Rendered(renderer.render(deck, SlideFormat.INSTAGRAM), renderer.render(deck, SlideFormat.TIKTOK)));
            }
            return rendered;
        }

        /** Every language and format of one version share the vignette; a new illustration version picks another one. */
        private int artSeed() {
            return Objects.hash(post.id(), media.illustrationVersion());
        }

        private List<SocialPostMedia.Image> store(PostLanguage language, SlideFormat format, List<RenderedSlide> slides) {
            return slides.stream().map(slide -> {
                byte[] jpeg = slide.jpeg();
                String key = "posts/%s/%s/%s-%02d-%s.jpg".formatted(post.id(), language.code(), format.name().toLowerCase(Locale.ROOT),
                        slide.index() + 1, shortHash(jpeg));
                return new SocialPostMedia.Image(key, storage.storeSocialMedia(key, jpeg, "image/jpeg"));
            }).toList();
        }

        private WineDay wineDay() {
            return Objects.isNull(post.wineDayCode()) ? null : wineDays.all().stream()
                    .filter(candidate -> candidate.code().equals(post.wineDayCode())).findFirst().orElse(null);
        }
    }

    /** The hero PNG of a run; null means the cover uses the pillar vignette. */
    private record Hero(byte[] png) {
    }

    /** One language's rendered slides, per format. */
    private record Rendered(List<RenderedSlide> instagram, List<RenderedSlide> tiktok) {
    }

    private static String shortHash(byte[] content) {
        return ContentHash.sha256(content).substring(0, KEY_HASH_LENGTH);
    }
}
