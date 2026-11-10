package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.RenderedSlide;
import com.vinnot.marketing.application.model.SlideDeck;
import com.vinnot.marketing.application.model.SlideFormat;
import com.vinnot.marketing.application.port.out.SlideRenderer;
import com.vinnot.marketing.application.port.out.SlideRenderer.SlideRenderingException;
import com.vinnot.marketing.application.port.out.SocialMediaRenderQueue;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.application.port.out.StyleReferenceCatalog;
import com.vinnot.marketing.application.port.out.WineDayCatalog;
import com.vinnot.marketing.domain.model.ContentHash;
import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostMedia;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.shared.application.exception.AiImageGenerationException;
import com.vinnot.shared.application.port.AiImageService;
import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.shared.application.port.FileStoragePort.StoredFile;
import com.vinnot.shared.application.port.GeneratedImage;
import com.vinnot.shared.application.port.ImageEditRequest;
import com.vinnot.shared.application.port.ReferenceImage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static com.vinnot.marketing.application.service.MarketingFixtures.NOW;
import static com.vinnot.marketing.application.service.MarketingFixtures.SATURDAY_SLOT;
import static com.vinnot.marketing.application.service.MarketingFixtures.TUESDAY_SLOT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.endsWith;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * S1, S2, S6: the render job paints or reuses the hero, falls back to the vignette, renders both formats and stores them.
 * #497 S8: one slide set per language under a language folder, and only the languages whose copy changed are rendered.
 */
class RenderSocialMediaServiceTest {
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 1, 2, 3};
    private static final byte[] HERO = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 9, 9, 9};
    private final SocialPostRepository posts = mock(SocialPostRepository.class);
    private final WineDayCatalog wineDays = mock(WineDayCatalog.class);
    private final AiImageService images = mock(AiImageService.class);
    private final StyleReferenceCatalog references = mock(StyleReferenceCatalog.class);
    private final SlideRenderer renderer = mock(SlideRenderer.class);
    private final FileStoragePort storage = mock(FileStoragePort.class);
    private final SocialMediaRenderQueue queue = mock(SocialMediaRenderQueue.class);
    private final RenderSocialMediaService service = new RenderSocialMediaService(posts, wineDays, images, references, renderer, storage,
            queue, new IllustrationPromptBuilder());
    private final ArgumentCaptor<SocialPostMedia> written = ArgumentCaptor.forClass(SocialPostMedia.class);

    @BeforeEach
    void ports() {
        when(wineDays.all()).thenReturn(List.of(MarketingFixtures.MERLOT));
        when(references.references()).thenReturn(List.of(new ReferenceImage("winery.png", PNG)));
        when(images.isAvailable()).thenReturn(true);
        when(images.edit(any())).thenReturn(new GeneratedImage(HERO, "gpt-image-1"));
        when(renderer.render(any(), eq(SlideFormat.INSTAGRAM))).thenReturn(List.of(slide(0, "ig-cover"), slide(1, "ig-card")));
        when(renderer.render(any(), eq(SlideFormat.TIKTOK))).thenReturn(List.of(slide(0, "tt-cover")));
        when(storage.storeSocialMedia(anyString(), any(), anyString())).thenAnswer(invocation -> "https://cdn/" + invocation.getArgument(0));
        when(posts.saveMedia(any(), any(), any())).thenReturn(true);
    }

    @Test
    void paintsATransparentHeroInTheHouseStyleAndStoresEverySlideUnderContentAddressedKeys() {
        SocialPost post = stored(MarketingFixtures.pending(SATURDAY_SLOT, "WINE_DAY", "MERLOT"));
        String prefix = "posts/" + post.id() + "/";

        service.render(post.id(), NOW);

        ArgumentCaptor<ImageEditRequest> request = ArgumentCaptor.forClass(ImageEditRequest.class);
        verify(images).edit(request.capture());
        assertThat(request.getValue().transparentBackground()).isTrue();
        assertThat(request.getValue().prompt()).contains("International Merlot Day").contains("watercolor");
        assertThat(request.getValue().references()).hasSize(1);
        verify(storage).storeSocialMedia(eq(prefix + "hero-" + hash(HERO) + ".png"), eq(HERO), eq("image/png"));
        for (String language : List.of("es", "en")) {
            verify(storage).storeSocialMedia(eq(prefix + language + "/instagram-01-" + hash(bytes("ig-cover")) + ".jpg"), any(), eq("image/jpeg"));
            verify(storage).storeSocialMedia(eq(prefix + language + "/instagram-02-" + hash(bytes("ig-card")) + ".jpg"), any(), eq("image/jpeg"));
            verify(storage).storeSocialMedia(eq(prefix + language + "/tiktok-01-" + hash(bytes("tt-cover")) + ".jpg"), any(), eq("image/jpeg"));
        }
        ArgumentCaptor<SlideDeck> deck = ArgumentCaptor.forClass(SlideDeck.class);
        verify(renderer, times(2)).render(deck.capture(), eq(SlideFormat.INSTAGRAM));
        assertThat(deck.getAllValues()).allSatisfy(drawn -> {
            assertThat(drawn.illustrationPng()).isEqualTo(HERO);
            assertThat(drawn.pillarCode()).isEqualTo("WINE_DAY");
        });
        assertThat(deck.getAllValues()).extracting(SlideDeck::language).containsExactly("es", "en");
        assertThat(deck.getAllValues()).extracting(SlideDeck::hook).containsExactly(post.copies().es().hook(), post.copies().en().hook());
        assertThat(deck.getAllValues()).extracting(SlideDeck::legalLine)
                .containsExactly(PostLanguage.ES.legalLine(), PostLanguage.EN.legalLine());

        SocialPostMedia media = last(3);
        assertThat(media.status()).isEqualTo(SocialPostMedia.Status.READY);
        assertThat(media.attempts()).isEqualTo(1);
        assertThat(media.illustration().source()).isEqualTo(SocialPostMedia.Source.AI);
        assertThat(media.illustration().image().url()).isEqualTo("https://cdn/" + prefix + "hero-" + hash(HERO) + ".png");
        assertThat(media.slides().get(PostLanguage.ES).instagram()).extracting(SocialPostMedia.Image::key)
                .containsExactly(prefix + "es/instagram-01-" + hash(bytes("ig-cover")) + ".jpg", prefix + "es/instagram-02-" + hash(bytes("ig-card")) + ".jpg");
        assertThat(media.slides().get(PostLanguage.EN).tiktok()).extracting(SocialPostMedia.Image::key)
                .containsExactly(prefix + "en/tiktok-01-" + hash(bytes("tt-cover")) + ".jpg");
        assertThat(media.slides().get(PostLanguage.ES).copyHash()).isEqualTo(post.copies().es().mediaHash());
        assertThat(media.slides().get(PostLanguage.EN).copyHash()).isEqualTo(post.copies().en().mediaHash());
        verify(storage, never()).deleteSocialMedia(anyString());
    }

    @Test
    void editingOneLanguageReRendersOnlyThatLanguageAndKeepsTheOtherSlides() {
        SocialPost post = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        String subject = new IllustrationPromptBuilder().subject(post.copies(), "CURIOUS_FACT", null);
        SocialPostMedia.Image hero = new SocialPostMedia.Image("posts/p/hero-old.png", "https://cdn/hero-old.png");
        SocialPostMedia.Image spanish = new SocialPostMedia.Image("posts/p/es/instagram-01-es.jpg", "https://cdn/es.jpg");
        SocialPostMedia.Image oldEnglish = new SocialPostMedia.Image("posts/p/en/instagram-01-en.jpg", "https://cdn/en.jpg");
        SocialPostMedia ready = post.media().withIllustration(SocialPostMedia.Illustration.ai(1, subject, hero), NOW).rendered(Map.of(
                PostLanguage.ES, new SocialPostMedia.SlideImages(List.of(spanish), List.of()),
                PostLanguage.EN, new SocialPostMedia.SlideImages(List.of(oldEnglish), List.of())), NOW);
        PostCopy english = PostCopy.of(PostLanguage.EN, "A new hook", post.copies().en().slides(), "Text", MarketingFixtures.TAGS_EN, "Alt",
                "And you?");
        SocialPost edited = withMedia(post, ready);
        edited.edit(PostLanguage.EN, english, UUID.randomUUID(), NOW);
        stored(edited);
        when(storage.loadSocialMedia(hero.key())).thenReturn(Optional.of(new StoredFile(new ByteArrayInputStream(HERO), "image/png", HERO.length)));

        service.render(edited.id(), NOW);

        ArgumentCaptor<SlideDeck> deck = ArgumentCaptor.forClass(SlideDeck.class);
        verify(renderer).render(deck.capture(), eq(SlideFormat.INSTAGRAM));
        assertThat(deck.getValue().language()).isEqualTo("en");
        assertThat(deck.getValue().hook()).isEqualTo("A new hook");
        verify(storage, never()).storeSocialMedia(startsWith("posts/" + edited.id() + "/es/"), any(), anyString());
        SocialPostMedia media = last(2);
        assertThat(media.status()).isEqualTo(SocialPostMedia.Status.READY);
        assertThat(media.slides().get(PostLanguage.ES).instagram()).containsExactly(spanish);
        assertThat(media.slides().get(PostLanguage.EN).copyHash()).isEqualTo(edited.copies().en().mediaHash());
        verify(storage).deleteSocialMedia(oldEnglish.key());
        verify(storage, never()).deleteSocialMedia(spanish.key());
    }

    @Test
    void withoutAiImagesTheCoverUsesThePillarVignette() {
        SocialPost post = stored(MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null));
        when(images.isAvailable()).thenReturn(false);

        service.render(post.id(), NOW);

        verify(images, never()).edit(any());
        ArgumentCaptor<SlideDeck> deck = ArgumentCaptor.forClass(SlideDeck.class);
        verify(renderer, times(2)).render(deck.capture(), eq(SlideFormat.TIKTOK));
        assertThat(deck.getAllValues()).noneMatch(SlideDeck::hasIllustration);
        // Both languages of one illustration version share the vignette seed; the seed follows the post and the version.
        assertThat(deck.getAllValues()).extracting(SlideDeck::artSeed).containsOnly(Objects.hash(post.id(), 1));
        SocialPostMedia media = last(3);
        assertThat(media.status()).isEqualTo(SocialPostMedia.Status.READY);
        assertThat(media.illustration().source()).isEqualTo(SocialPostMedia.Source.FALLBACK);
        assertThat(media.illustration().reason()).isEqualTo(AiImageGenerationException.UNAVAILABLE);
        assertThat(media.illustration().subject()).isNotBlank();
    }

    @Test
    void aRejectedOpaqueImageOrMissingStyleReferencesFallBack() {
        SocialPost post = stored(MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null));
        when(images.edit(any())).thenThrow(AiImageGenerationException.rejected("opaque"));

        service.render(post.id(), NOW);

        assertThat(last(3).illustration().reason()).isEqualTo(AiImageGenerationException.REJECTED);

        SocialPost other = stored(MarketingFixtures.pending(SATURDAY_SLOT, "CURIOUS_FACT", null));
        when(references.references()).thenReturn(List.of());
        service.render(other.id(), NOW);
        verify(images).edit(any());
        assertThat(last(6).illustration().source()).isEqualTo(SocialPostMedia.Source.FALLBACK);
        assertThat(last(6).illustration().reason()).isEqualTo(AiImageGenerationException.UNAVAILABLE);
    }

    @Test
    void anUnchangedIllustrationVersionReusesTheStoredHeroAndReplacedSlidesAreCleanedUp() {
        SocialPost post = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        String subject = new IllustrationPromptBuilder().subject(post.copies(), "CURIOUS_FACT", null);
        SocialPostMedia.Image hero = new SocialPostMedia.Image("posts/p/hero-old.png", "https://cdn/hero-old.png");
        SocialPostMedia.Image oldSlide = new SocialPostMedia.Image("posts/p/es/instagram-01-old.jpg", "https://cdn/old.jpg");
        SocialPostMedia previous = SocialPostMedia.pending(Map.of(PostLanguage.ES, "older-copy", PostLanguage.EN, "older-en"), 1, NOW)
                .withIllustration(SocialPostMedia.Illustration.ai(1, subject, hero), NOW)
                .rendered(Map.of(PostLanguage.ES, new SocialPostMedia.SlideImages(List.of(oldSlide), List.of())), NOW)
                .forCopy(post.copies().mediaHashes(), NOW);
        stored(withMedia(post, previous));
        when(storage.loadSocialMedia(hero.key())).thenReturn(Optional.of(new StoredFile(new ByteArrayInputStream(HERO), "image/png", HERO.length)));

        service.render(post.id(), NOW);

        verify(images, never()).edit(any());
        ArgumentCaptor<SlideDeck> deck = ArgumentCaptor.forClass(SlideDeck.class);
        verify(renderer, times(2)).render(deck.capture(), eq(SlideFormat.INSTAGRAM));
        assertThat(deck.getValue().illustrationPng()).isEqualTo(HERO);
        SocialPostMedia media = last(2);
        assertThat(media.status()).isEqualTo(SocialPostMedia.Status.READY);
        assertThat(media.illustration().image()).isEqualTo(hero);
        verify(storage).deleteSocialMedia(oldSlide.key());
        verify(storage, never()).deleteSocialMedia(hero.key());
    }

    @Test
    void aFallbackOfTheSameVersionIsKeptAndAMissingOrUnreadableHeroIsPaintedAgain() {
        SocialPost post = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        String subject = new IllustrationPromptBuilder().subject(post.copies(), "CURIOUS_FACT", null);
        stored(withMedia(post, post.media().withIllustration(SocialPostMedia.Illustration.fallback(1, subject, "AI_IMAGE_FAILED"), NOW)));

        service.render(post.id(), NOW);

        verify(images, never()).edit(any());
        assertThat(last(2).illustration().reason()).isEqualTo("AI_IMAGE_FAILED");

        SocialPostMedia.Image gone = new SocialPostMedia.Image("posts/p/hero-gone.png", "https://cdn/hero-gone.png");
        SocialPost missing = MarketingFixtures.pending(SATURDAY_SLOT, "CURIOUS_FACT", null);
        stored(withMedia(missing, missing.media().withIllustration(SocialPostMedia.Illustration.ai(1, subject, gone), NOW)));
        when(storage.loadSocialMedia(gone.key())).thenReturn(Optional.empty());
        service.render(missing.id(), NOW);
        verify(images, times(1)).edit(any());
        verify(storage).deleteSocialMedia(gone.key());

        SocialPostMedia.Image broken = new SocialPostMedia.Image("posts/p/hero-broken.png", "https://cdn/hero-broken.png");
        SocialPost unreadable = MarketingFixtures.pending(SATURDAY_SLOT.plusSeconds(86_400), "CURIOUS_FACT", null);
        stored(withMedia(unreadable, unreadable.media().withIllustration(SocialPostMedia.Illustration.ai(1, subject, broken), NOW)));
        when(storage.loadSocialMedia(broken.key())).thenReturn(Optional.of(new StoredFile(failingStream(), "image/png", 10)));
        service.render(unreadable.id(), NOW);
        verify(images, times(2)).edit(any());
    }

    @Test
    void anIllustrationTheRendererCannotUseFallsBackToTheVignette() {
        SocialPost post = stored(MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null));
        when(renderer.render(any(), eq(SlideFormat.INSTAGRAM))).thenAnswer(invocation -> {
            if (invocation.getArgument(0, SlideDeck.class).hasIllustration()) {
                throw new SlideRenderingException(SlideRenderer.Reason.INVALID_ILLUSTRATION, "bad hero");
            }
            return List.of(slide(0, "ig-cover"));
        });

        service.render(post.id(), NOW);

        SocialPostMedia media = last(4);
        assertThat(media.status()).isEqualTo(SocialPostMedia.Status.READY);
        assertThat(media.illustration().source()).isEqualTo(SocialPostMedia.Source.FALLBACK);
        assertThat(media.illustration().reason()).isEqualTo("INVALID_ILLUSTRATION");
        verify(storage).deleteSocialMedia("posts/" + post.id() + "/hero-" + hash(HERO) + ".png");
    }

    @Test
    void anInvalidVignetteDeckFailsForGood() {
        SocialPost post = stored(MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null));
        when(images.isAvailable()).thenReturn(false);
        when(renderer.render(any(), eq(SlideFormat.INSTAGRAM)))
                .thenThrow(new SlideRenderingException(SlideRenderer.Reason.INVALID_ILLUSTRATION, "no vignette"));

        service.render(post.id(), NOW);

        assertThat(last(3).status()).isEqualTo(SocialPostMedia.Status.FAILED);
        assertThat(last(3).error()).isEqualTo("INVALID_ILLUSTRATION");
    }

    @Test
    void aBusyRendererIsRetriedByTheWorkerAndTextThatDoesNotFitFails() {
        SocialPost post = stored(MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null));
        when(renderer.render(any(), eq(SlideFormat.INSTAGRAM))).thenThrow(new SlideRenderingException(SlideRenderer.Reason.BUSY, "busy"));

        assertThatThrownBy(() -> service.render(post.id(), NOW)).isInstanceOf(SlideRenderingException.class);
        assertThat(last(3).status()).isEqualTo(SocialPostMedia.Status.PENDING);
        assertThat(last(3).error()).isEqualTo("BUSY");

        SocialPost tooLong = stored(MarketingFixtures.pending(SATURDAY_SLOT, "CURIOUS_FACT", null));
        when(renderer.render(any(), eq(SlideFormat.INSTAGRAM)))
                .thenThrow(new SlideRenderingException(SlideRenderer.Reason.TEXT_DOES_NOT_FIT, "long"));
        service.render(tooLong.id(), NOW);
        assertThat(last(6).status()).isEqualTo(SocialPostMedia.Status.FAILED);
        assertThat(last(6).error()).isEqualTo("TEXT_DOES_NOT_FIT");
        verify(storage, never()).storeSocialMedia(anyString(), any(), eq("image/jpeg"));
    }

    @Test
    void anyOtherFailureIsRecordedAndRethrownForTheRetry() {
        SocialPost post = stored(MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null));
        when(storage.storeSocialMedia(anyString(), any(), eq("image/jpeg"))).thenThrow(new IllegalStateException("R2 down"));

        assertThatThrownBy(() -> service.render(post.id(), NOW)).isInstanceOf(IllegalStateException.class);

        assertThat(last(3).status()).isEqualTo(SocialPostMedia.Status.PENDING);
        assertThat(last(3).error()).isEqualTo("IllegalStateException");
    }

    @Test
    void aHeroThatCannotBeStoredIsPaidOnceAndTheRetriedRenderEndsReadyWithTheVignette() {
        SocialPost post = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        AtomicReference<SocialPostMedia> row = new AtomicReference<>(post.media());
        when(posts.findById(post.id())).thenAnswer(invocation -> Optional.of(withMedia(post, row.get())));
        when(posts.saveMedia(eq(post.id()), any(), any())).thenAnswer(invocation ->
                Objects.equals(row.get(), invocation.getArgument(1)) && row.compareAndSet(row.get(), invocation.getArgument(2)));
        when(storage.storeSocialMedia(endsWith(".png"), any(), anyString())).thenThrow(new IllegalArgumentException("over 5MB"));

        for (int run = 0; run < RenderSocialMediaService.MAX_ATTEMPTS + 3; run++) {
            try {
                service.render(post.id(), NOW);
            } catch (RuntimeException ignored) {
                // a retryable failure is rethrown for the durable queue; the next iteration is its retry
            }
        }

        verify(images, times(1)).edit(any());
        SocialPostMedia media = row.get();
        assertThat(media.status()).isEqualTo(SocialPostMedia.Status.READY);
        assertThat(media.illustration().source()).isEqualTo(SocialPostMedia.Source.FALLBACK);
        assertThat(media.illustration().reason()).isEqualTo("HERO_STORE_FAILED");
        assertThat(media.slides().get(PostLanguage.ES).instagram()).hasSize(2);
        assertThat(media.slides().get(PostLanguage.EN).instagram()).hasSize(2);
        ArgumentCaptor<SlideDeck> deck = ArgumentCaptor.forClass(SlideDeck.class);
        verify(renderer, times(2)).render(deck.capture(), eq(SlideFormat.INSTAGRAM));
        assertThat(deck.getAllValues()).noneMatch(SlideDeck::hasIllustration);
        verify(storage, never()).deleteSocialMedia(anyString());
    }

    @Test
    void attemptsAreCappedSoAPostCannotRenderForever() {
        SocialPost post = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        SocialPostMedia media = post.media();
        for (int attempt = 0; attempt < RenderSocialMediaService.MAX_ATTEMPTS; attempt++) {
            media = media.attempted(NOW);
        }
        stored(withMedia(post, media));

        service.render(post.id(), NOW);

        assertThat(last(1).status()).isEqualTo(SocialPostMedia.Status.FAILED);
        assertThat(last(1).error()).isEqualTo(RenderSocialMediaService.ATTEMPTS_EXHAUSTED);
        verifyNoInteractions(renderer);
    }

    @Test
    void nothingIsDoneForAMissingPostAPostWithoutCopyOrMediaAlreadyReadyOrFailed() {
        when(posts.findById(any())).thenReturn(Optional.empty());
        service.render(UUID.randomUUID(), NOW);
        stored(MarketingFixtures.draft(TUESDAY_SLOT, "CURIOUS_FACT", null));
        SocialPost ready = MarketingFixtures.pending(SATURDAY_SLOT, "CURIOUS_FACT", null);
        stored(withMedia(ready, ready.media().rendered(Map.of(PostLanguage.ES, new SocialPostMedia.SlideImages(List.of(), List.of()),
                PostLanguage.EN, new SocialPostMedia.SlideImages(List.of(), List.of())), NOW)));
        SocialPost failed = MarketingFixtures.pending(SATURDAY_SLOT.plusSeconds(86_400), "CURIOUS_FACT", null);
        stored(withMedia(failed, failed.media().failed("TEXT_DOES_NOT_FIT", NOW)));

        service.render(ready.id(), NOW);
        service.render(failed.id(), NOW);

        verify(posts, never()).saveMedia(any(), any(), any());
        verifyNoInteractions(renderer, images);
    }

    @Test
    void aLegacyPostGetsItsFirstMediaAndALostRaceStopsTheRun() {
        SocialPost legacy = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        stored(withMedia(legacy, null));
        when(posts.saveMedia(eq(legacy.id()), eq(null), any())).thenReturn(false);

        service.render(legacy.id(), NOW);

        verify(posts).saveMedia(eq(legacy.id()), eq(null), written.capture());
        assertThat(written.getValue().attempts()).isEqualTo(1);
        verifyNoInteractions(renderer, images);
    }

    @Test
    void aRaceLostAfterThePaintingOrTheRenderStopsWithoutCleaningUp() {
        SocialPost post = stored(MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null));
        when(posts.saveMedia(eq(post.id()), any(), any())).thenReturn(true, false);

        service.render(post.id(), NOW);

        verifyNoInteractions(renderer);

        SocialPost other = stored(MarketingFixtures.pending(SATURDAY_SLOT, "CURIOUS_FACT", null));
        when(posts.saveMedia(eq(other.id()), any(), any())).thenReturn(true, true, false);
        service.render(other.id(), NOW);
        verify(storage, never()).deleteSocialMedia(anyString());

        SocialPost fallback = stored(MarketingFixtures.pending(SATURDAY_SLOT.plusSeconds(86_400), "CURIOUS_FACT", null));
        when(renderer.render(any(), eq(SlideFormat.INSTAGRAM)))
                .thenThrow(new SlideRenderingException(SlideRenderer.Reason.INVALID_ILLUSTRATION, "bad hero"));
        when(posts.saveMedia(eq(fallback.id()), any(), any())).thenReturn(true, true, false);
        service.render(fallback.id(), NOW);
        verify(renderer, times(3)).render(any(), eq(SlideFormat.INSTAGRAM));
    }

    @Test
    void theSweepQueuesEveryPostStillWaitingForMedia() {
        SocialPost pending = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        SocialPost legacy = withMedia(MarketingFixtures.pending(SATURDAY_SLOT, "CURIOUS_FACT", null), null);
        SocialPost published = SocialPost.restore(UUID.randomUUID(), SocialPostStatus.PUBLISHED, SATURDAY_SLOT, "CURIOUS_FACT", null,
                MarketingFixtures.COPIES, MarketingFixtures.GENERATED, null, null, NOW, NOW);
        when(posts.findAwaitingMedia(NOW, RenderSocialMediaService.PENDING_BATCH)).thenReturn(List.of(pending, legacy, published));

        assertThat(service.requestPending(NOW)).isEqualTo(2);

        verify(queue).requestFor(pending);
        verify(queue).requestFor(legacy);
        assertThat(legacy.media().copyHashes()).isEqualTo(legacy.copies().mediaHashes());
        verify(queue, never()).requestFor(published);
    }

    private SocialPost stored(SocialPost post) {
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        return post;
    }

    private static SocialPost withMedia(SocialPost post, SocialPostMedia media) {
        return SocialPost.restore(post.id(), post.status(), post.scheduledFor(), post.pillarCode(), post.wineDayCode(), post.copies(),
                post.generation(), post.review(), media, post.createdAt(), post.updatedAt());
    }

    private SocialPostMedia last(int writes) {
        verify(posts, times(writes)).saveMedia(any(), any(), written.capture());
        return written.getValue();
    }

    private static RenderedSlide slide(int index, String content) {
        return new RenderedSlide(index, bytes(content), 1080, 1350);
    }

    private static byte[] bytes(String content) {
        return content.getBytes(StandardCharsets.UTF_8);
    }

    private static String hash(byte[] content) {
        return ContentHash.sha256(content).substring(0, 16);
    }

    private static InputStream failingStream() {
        return new InputStream() {
            @Override
            public int read() throws IOException {
                throw new IOException("broken");
            }
        };
    }
}
