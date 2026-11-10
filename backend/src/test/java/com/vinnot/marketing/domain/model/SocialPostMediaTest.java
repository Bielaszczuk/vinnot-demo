package com.vinnot.marketing.domain.model;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * S6: media is versioned by the copy hashes and the illustration version; a finished render is never shown for other copy.
 * #497 S8: one slide set per language, each tracking its own copy hash; ready only when every language is rendered.
 */
class SocialPostMediaTest {
    private static final Instant NOW = Instant.parse("2026-11-02T12:00:00Z");
    private static final Instant LATER = NOW.plusSeconds(60);
    private static final Map<PostLanguage, String> HASHES = Map.of(PostLanguage.ES, "hash-es", PostLanguage.EN, "hash-en");
    private static final SocialPostMedia.Image HERO = new SocialPostMedia.Image("posts/p/hero-1.png", "https://cdn/hero-1.png");
    private static final SocialPostMedia.Image SLIDE = new SocialPostMedia.Image("posts/p/es/instagram-01-a.jpg", "https://cdn/ig-1.jpg");
    private static final SocialPostMedia.Image CLIP = new SocialPostMedia.Image("posts/p/es/tiktok-01-a.jpg", "https://cdn/tt-1.jpg");
    private static final SocialPostMedia.Image SLIDE_EN = new SocialPostMedia.Image("posts/p/en/instagram-01-b.jpg", "https://cdn/ig-en.jpg");
    private static final SocialPostMedia.Image CLIP_EN = new SocialPostMedia.Image("posts/p/en/tiktok-01-b.jpg", "https://cdn/tt-en.jpg");
    private static final Map<PostLanguage, SocialPostMedia.SlideImages> BOTH = Map.of(
            PostLanguage.ES, new SocialPostMedia.SlideImages(List.of(SLIDE), List.of(CLIP)),
            PostLanguage.EN, new SocialPostMedia.SlideImages(List.of(SLIDE_EN), List.of(CLIP_EN)));

    @Test
    void aPendingRenderBecomesReadyAndKeepsItsKeys() {
        SocialPostMedia media = SocialPostMedia.pending(HASHES, 1, NOW);
        assertThat(media.status()).isEqualTo(SocialPostMedia.Status.PENDING);
        assertThat(media.attempts()).isZero();
        assertThat(media.keys()).isEmpty();
        assertThat(media.currentSlides(PostLanguage.ES)).isNull();
        assertThat(media.staleLanguages()).containsExactly(PostLanguage.ES, PostLanguage.EN);

        SocialPostMedia attempted = media.attempted(LATER);
        assertThat(attempted.attempts()).isEqualTo(1);
        assertThat(attempted.updatedAt()).isEqualTo(LATER);

        SocialPostMedia.Illustration ai = SocialPostMedia.Illustration.ai(1, "grapes", HERO);
        SocialPostMedia illustrated = attempted.withIllustration(ai, LATER);
        assertThat(illustrated.illustration()).isEqualTo(ai);
        assertThat(illustrated.reusableIllustration("grapes")).isEqualTo(ai);
        assertThat(illustrated.reusableIllustration("a cork")).isNull();

        SocialPostMedia ready = illustrated.rendered(BOTH, LATER);
        assertThat(ready.status()).isEqualTo(SocialPostMedia.Status.READY);
        assertThat(ready.error()).isNull();
        assertThat(ready.slides().get(PostLanguage.ES).copyHash()).isEqualTo("hash-es");
        assertThat(ready.slides().get(PostLanguage.EN).copyHash()).isEqualTo("hash-en");
        assertThat(ready.slides().get(PostLanguage.ES).illustrationVersion()).isEqualTo(1);
        assertThat(ready.slides().get(PostLanguage.ES).renderedAt()).isEqualTo(LATER);
        assertThat(ready.currentSlides(PostLanguage.ES)).isEqualTo(ready.slides().get(PostLanguage.ES));
        assertThat(ready.staleLanguages()).isEmpty();
        assertThat(ready.keys()).containsExactly(HERO.key(), SLIDE.key(), CLIP.key(), SLIDE_EN.key(), CLIP_EN.key());
    }

    @Test
    void theMediaIsReadyOnlyOnceEveryLanguageIsRendered() {
        SocialPostMedia media = SocialPostMedia.pending(HASHES, 1, NOW);

        SocialPostMedia spanishOnly = media.rendered(Map.of(PostLanguage.ES, BOTH.get(PostLanguage.ES)), LATER);

        assertThat(spanishOnly.status()).isEqualTo(SocialPostMedia.Status.PENDING);
        assertThat(spanishOnly.staleLanguages()).containsExactly(PostLanguage.EN);
        assertThat(spanishOnly.rendered(Map.of(PostLanguage.EN, BOTH.get(PostLanguage.EN)), LATER).status())
                .isEqualTo(SocialPostMedia.Status.READY);
        assertThatThrownBy(() -> SocialPostMedia.pending(Map.of(PostLanguage.ES, "h"), 1, NOW).rendered(BOTH, LATER))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("en");
    }

    @Test
    void editingOneLanguageMakesOnlyThatLanguageStale() {
        SocialPostMedia ready = SocialPostMedia.pending(HASHES, 1, NOW).rendered(BOTH, NOW);

        SocialPostMedia edited = ready.forCopy(Map.of(PostLanguage.ES, "hash-es", PostLanguage.EN, "hash-en-2"), LATER);

        assertThat(edited.status()).isEqualTo(SocialPostMedia.Status.PENDING);
        assertThat(edited.staleLanguages()).containsExactly(PostLanguage.EN);
        assertThat(edited.currentSlides(PostLanguage.ES)).isEqualTo(ready.slides().get(PostLanguage.ES));
        assertThat(edited.currentSlides(PostLanguage.EN)).isNull();
        assertThat(edited.targetHash()).isNotEqualTo(ready.targetHash()).matches("[0-9a-f]{64}");
    }

    @Test
    void newCopyOrANewIllustrationMakeItPendingWhileTheOldRenderStaysUntilReplaced() {
        SocialPostMedia ready = SocialPostMedia.pending(HASHES, 1, NOW).withIllustration(SocialPostMedia.Illustration.ai(1, "grapes",
                HERO), NOW).rendered(BOTH, NOW);

        assertThat(ready.forCopy(HASHES, LATER)).isSameAs(ready);
        Map<PostLanguage, String> other = Map.of(PostLanguage.ES, "hash-es-2", PostLanguage.EN, "hash-en-2");
        SocialPostMedia edited = ready.forCopy(other, LATER);
        assertThat(edited.status()).isEqualTo(SocialPostMedia.Status.PENDING);
        assertThat(edited.copyHashes()).isEqualTo(other);
        assertThat(edited.illustrationVersion()).isEqualTo(1);
        assertThat(edited.slides()).isEqualTo(ready.slides());
        assertThat(edited.currentSlides(PostLanguage.ES)).isNull();
        assertThat(edited.keys()).containsExactlyElementsOf(ready.keys());

        SocialPostMedia back = edited.attempted(LATER).forCopy(HASHES, LATER);
        assertThat(back.status()).isEqualTo(SocialPostMedia.Status.READY);
        assertThat(back.attempts()).isZero();

        SocialPostMedia again = ready.failed("TEXT_DOES_NOT_FIT", LATER).newIllustration(LATER);
        assertThat(again.status()).isEqualTo(SocialPostMedia.Status.PENDING);
        assertThat(again.illustrationVersion()).isEqualTo(2);
        assertThat(again.error()).isNull();
        assertThat(again.reusableIllustration("grapes")).isNull();
        assertThat(again.staleLanguages()).as("a new illustration re-renders every language").containsExactly(PostLanguage.ES, PostLanguage.EN);
        assertThat(again.currentSlides(PostLanguage.EN)).as("the old slides still show this copy until the new ones are ready")
                .isEqualTo(ready.slides().get(PostLanguage.EN));
    }

    @Test
    void failuresAndRetriesKeepTheReason() {
        SocialPostMedia media = SocialPostMedia.pending(HASHES, 1, NOW).attempted(NOW);
        SocialPostMedia retrying = media.retrying("BUSY", LATER);
        assertThat(retrying.status()).isEqualTo(SocialPostMedia.Status.PENDING);
        assertThat(retrying.error()).isEqualTo("BUSY");
        assertThat(retrying.attempts()).isEqualTo(1);
        SocialPostMedia failed = retrying.failed("TEXT_DOES_NOT_FIT", LATER);
        assertThat(failed.status()).isEqualTo(SocialPostMedia.Status.FAILED);
        assertThat(failed.error()).isEqualTo("TEXT_DOES_NOT_FIT");
    }

    @Test
    void aFallbackIllustrationHasNoImageAndAnAiOneNeedsIt() {
        SocialPostMedia.Illustration fallback = SocialPostMedia.Illustration.fallback(2, "grapes", "AI_IMAGE_UNAVAILABLE");
        assertThat(fallback.source()).isEqualTo(SocialPostMedia.Source.FALLBACK);
        assertThat(fallback.image()).isNull();
        assertThat(fallback.reason()).isEqualTo("AI_IMAGE_UNAVAILABLE");
        SocialPostMedia media = SocialPostMedia.pending(HASHES, 2, NOW).withIllustration(fallback, NOW);
        assertThat(media.keys()).isEmpty();
        assertThatThrownBy(() -> new SocialPostMedia.Illustration(1, "grapes", SocialPostMedia.Source.AI, null, null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new SocialPostMedia.Image(" ", "url")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SocialPostMedia.pending(HASHES, -1, NOW)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SocialPostMedia.pending(Map.of(), 1, NOW)).isInstanceOf(IllegalArgumentException.class);
    }
}
