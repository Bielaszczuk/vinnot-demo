package com.vinnot.marketing.domain.model;

import com.vinnot.marketing.domain.exception.InvalidPostTransitionException;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * #510 S2, S3 and S8: an approved post with ready Spanish media starts publishing, ends published or failed, can be retried
 * after a failure, and a pending post can be approved by the system. Once publishing starts its media is frozen.
 */
class SocialPostPublishingTest {
    private static final Instant PLANNED_AT = Instant.parse("2026-11-02T12:00:00Z");
    private static final Instant SLOT = Instant.parse("2026-11-03T22:00:00Z");
    private static final Instant LATER = PLANNED_AT.plusSeconds(3600);
    private static final Instant START = SLOT.plusSeconds(60);
    private static final Instant END = START.plusSeconds(120);
    private static final List<PostCopy.Slide> SLIDES = List.of(new PostCopy.Slide("Uno", "a"), new PostCopy.Slide("Dos", "b"),
            new PostCopy.Slide("Tres", "c"));
    private static final PostCopies COPIES = new PostCopies(
            PostCopy.of(PostLanguage.ES, "Hola", SLIDES, "Texto", List.of("#vinnot", "#malbec", "#vino", "#cata", "#tinto"), "Alt", "¿Y tú?"),
            PostCopy.of(PostLanguage.EN, "Hello", SLIDES, "Text", List.of("#vinnot", "#malbec", "#wine", "#tasting", "#red"), "Alt",
                    "And you?"));
    private static final GenerationInfo GENERATED = new GenerationInfo("openai", "gpt-4o-mini", false, 1, LATER, FactCheck.PASSED,
            List.of(), null);
    private static final SocialPostMedia.Image IG = new SocialPostMedia.Image("posts/p/es/instagram-01.jpg", "https://cdn/ig-1.jpg");
    private static final SocialPostMedia.Image TT = new SocialPostMedia.Image("posts/p/es/tiktok-01.jpg", "https://cdn/tt-1.jpg");
    private static final SocialPostMedia.SlideImages BOTH_FORMATS = new SocialPostMedia.SlideImages(List.of(IG), List.of(TT));
    private static final SocialPostMedia READY = SocialPostMedia.pending(COPIES.mediaHashes(), 1, LATER)
            .rendered(Map.of(PostLanguage.ES, BOTH_FORMATS, PostLanguage.EN, BOTH_FORMATS), LATER);
    private final UUID reviewer = UUID.randomUUID();

    @Test
    void anApprovedPostWithReadySpanishMediaStartsPublishing() {
        SocialPost post = stored(SocialPostStatus.APPROVED, READY);
        assertThat(post.readyToPublish()).isTrue();
        assertThat(post.publishing()).isNull();

        post.startPublishing(START);

        assertThat(post.status()).isEqualTo(SocialPostStatus.SCHEDULED);
        assertThat(post.publishing()).isEqualTo(new PostPublishing(START, null, null));
        assertThat(post.updatedAt()).isEqualTo(START);
        assertThat(post.review()).as("the approval stays").isEqualTo(new PostReview(reviewer, LATER, null, null));
    }

    @Test
    void publishingNeedsReadySpanishMediaWithBothFormats() {
        SocialPostMedia pending = SocialPostMedia.pending(COPIES.mediaHashes(), 1, LATER);
        SocialPostMedia noInstagram = pending.rendered(Map.of(PostLanguage.ES, new SocialPostMedia.SlideImages(List.of(), List.of(TT)),
                PostLanguage.EN, BOTH_FORMATS), LATER);
        SocialPostMedia noTiktok = pending.rendered(Map.of(PostLanguage.ES, new SocialPostMedia.SlideImages(List.of(IG), List.of()),
                PostLanguage.EN, BOTH_FORMATS), LATER);
        SocialPostMedia englishOnly = SocialPostMedia.pending(Map.of(PostLanguage.EN, COPIES.en().mediaHash()), 1, LATER)
                .rendered(Map.of(PostLanguage.EN, BOTH_FORMATS), LATER);

        for (SocialPostMedia media : Arrays.asList(null, pending, noInstagram, noTiktok, englishOnly)) {
            SocialPost post = stored(SocialPostStatus.APPROVED, media);
            assertThat(post.readyToPublish()).isFalse();
            assertThatThrownBy(() -> post.startPublishing(START)).isInstanceOf(InvalidPostTransitionException.class)
                    .hasMessageContaining("ready media");
            assertThat(post.status()).isEqualTo(SocialPostStatus.APPROVED);
            assertThat(post.publishing()).isNull();
        }
        assertThat(noInstagram.status()).as("ready, but without Instagram slides").isEqualTo(SocialPostMedia.Status.READY);
    }

    @Test
    void onlyAnApprovedPostStartsPublishing() {
        for (SocialPostStatus status : EnumSet.complementOf(EnumSet.of(SocialPostStatus.APPROVED))) {
            SocialPost post = stored(status, READY);
            assertThatThrownBy(() -> post.startPublishing(START)).as(status.name()).isInstanceOf(InvalidPostTransitionException.class)
                    .hasMessageContaining(status.name());
            assertThat(post.status()).isEqualTo(status);
        }
    }

    @Test
    void aScheduledPostBecomesPublishedWhenEveryNetworkSucceeded() {
        SocialPost post = scheduled();

        post.publishingSucceeded(END);

        assertThat(post.status()).isEqualTo(SocialPostStatus.PUBLISHED);
        assertThat(post.publishing()).isEqualTo(new PostPublishing(START, END, null));
        assertThat(post.updatedAt()).isEqualTo(END);
    }

    @Test
    void onlyAScheduledPostBecomesPublished() {
        for (SocialPostStatus status : EnumSet.complementOf(EnumSet.of(SocialPostStatus.SCHEDULED))) {
            SocialPost post = stored(status, READY);
            assertThatThrownBy(() -> post.publishingSucceeded(END)).as(status.name()).isInstanceOf(InvalidPostTransitionException.class);
            assertThat(post.status()).isEqualTo(status);
        }
    }

    @Test
    void aScheduledPostFailsKeepingWhenItStarted() {
        SocialPost post = scheduled();

        post.publishingFailed("TOKEN_INVALID", END);

        assertThat(post.status()).isEqualTo(SocialPostStatus.FAILED);
        assertThat(post.publishing()).isEqualTo(new PostPublishing(START, END, "TOKEN_INVALID"));
        assertThat(post.updatedAt()).isEqualTo(END);
    }

    @Test
    void anApprovedPostWhoseMediaNeverGotReadyFailsWithoutHavingStarted() {
        SocialPost post = stored(SocialPostStatus.APPROVED, null);

        post.publishingFailed("MEDIA_NOT_READY", END);

        assertThat(post.status()).isEqualTo(SocialPostStatus.FAILED);
        assertThat(post.publishing()).isEqualTo(new PostPublishing(null, END, "MEDIA_NOT_READY"));
    }

    @Test
    void onlyAnApprovedOrScheduledPostFails() {
        for (SocialPostStatus status : EnumSet.complementOf(EnumSet.of(SocialPostStatus.APPROVED, SocialPostStatus.SCHEDULED))) {
            SocialPost post = stored(status, READY);
            assertThatThrownBy(() -> post.publishingFailed("REJECTED", END)).as(status.name())
                    .isInstanceOf(InvalidPostTransitionException.class);
            assertThat(post.status()).isEqualTo(status);
        }
        assertThatThrownBy(() -> scheduled().publishingFailed(null, END)).isInstanceOf(NullPointerException.class);
    }

    @Test
    void aFailedPostIsScheduledAgainOnRetry() {
        SocialPost post = scheduled();
        post.publishingFailed("UNAVAILABLE", END);
        Instant retriedAt = END.plusSeconds(600);

        post.retryPublishing(retriedAt);

        assertThat(post.status()).isEqualTo(SocialPostStatus.SCHEDULED);
        assertThat(post.publishing()).isEqualTo(new PostPublishing(retriedAt, null, null));
        assertThat(post.updatedAt()).isEqualTo(retriedAt);
    }

    @Test
    void onlyAFailedPostWithReadyMediaIsRetried() {
        for (SocialPostStatus status : EnumSet.complementOf(EnumSet.of(SocialPostStatus.FAILED))) {
            SocialPost post = stored(status, READY);
            assertThatThrownBy(() -> post.retryPublishing(END)).as(status.name()).isInstanceOf(InvalidPostTransitionException.class);
        }
        SocialPost notReady = stored(SocialPostStatus.FAILED, SocialPostMedia.pending(COPIES.mediaHashes(), 2, LATER));
        assertThatThrownBy(() -> notReady.retryPublishing(END)).as("a retry would freeze media that is not ready")
                .isInstanceOf(InvalidPostTransitionException.class).hasMessageContaining("ready media");
        assertThat(notReady.status()).isEqualTo(SocialPostStatus.FAILED);
    }

    @Test
    void thePublishingRecordRoundTripsThroughRestore() {
        PostPublishing publishing = new PostPublishing(START, END, "REJECTED");
        SocialPost post = SocialPost.restore(UUID.randomUUID(), SocialPostStatus.FAILED, SLOT, "CURIOUS_FACT", null, COPIES, GENERATED,
                null, READY, publishing, PLANNED_AT, END);
        assertThat(post.publishing()).isEqualTo(publishing);

        SocialPost older = SocialPost.restore(UUID.randomUUID(), SocialPostStatus.APPROVED, SLOT, "CURIOUS_FACT", null, COPIES, GENERATED,
                null, READY, PLANNED_AT, PLANNED_AT);
        assertThat(older.publishing()).as("posts stored before #510 never started publishing").isNull();
    }

    @Test
    void aPendingPostIsApprovedByTheSystemWithoutAReviewer() {
        SocialPost post = stored(SocialPostStatus.PENDING_APPROVAL, READY);

        post.autoApprove(LATER);

        assertThat(post.status()).isEqualTo(SocialPostStatus.APPROVED);
        assertThat(post.review()).isEqualTo(PostReview.automatic(LATER));
        assertThat(post.review().reviewedBy()).isNull();
        assertThat(post.review().reason()).isEqualTo(PostReview.AUTO_APPROVED);
        assertThat(post.review().isAutomatic()).isTrue();
        assertThat(post.updatedAt()).isEqualTo(LATER);
    }

    @Test
    void onlyAPendingPostIsAutoApproved() {
        for (SocialPostStatus status : EnumSet.complementOf(EnumSet.of(SocialPostStatus.PENDING_APPROVAL))) {
            SocialPost post = stored(status, READY);
            assertThatThrownBy(() -> post.autoApprove(LATER)).as(status.name()).isInstanceOf(InvalidPostTransitionException.class);
        }
    }

    @Test
    void aHumanReviewIsNotAutomatic() {
        assertThat(new PostReview(reviewer, LATER, null, null).isAutomatic()).isFalse();
        assertThat(new PostReview(reviewer, LATER, PostReview.AUTO_APPROVED, null).isAutomatic())
                .as("a rejection whose reason reads AUTO_APPROVED still has a reviewer").isFalse();
        assertThat(new PostReview(null, null, null, reviewer).isAutomatic()).as("an edit only").isFalse();
        assertThat(new PostReview(null, LATER, "other", null).isAutomatic()).isFalse();
    }

    @Test
    void aScheduledOrPublishedPostKeepsItsMediaFrozen() {
        for (SocialPostStatus status : List.of(SocialPostStatus.SCHEDULED, SocialPostStatus.PUBLISHED)) {
            SocialPost post = stored(status, READY);
            assertThatThrownBy(() -> post.requestNewIllustration(LATER)).as(status.name())
                    .isInstanceOf(InvalidPostTransitionException.class).hasMessageContaining("request a new illustration for");
            assertThat(post.prepareMedia(LATER)).as(status.name()).isFalse();
            assertThat(post.media()).isEqualTo(READY);

            SocialPost legacy = stored(status, null);
            assertThat(legacy.prepareMedia(LATER)).as("no first media target once publishing started").isFalse();
            assertThat(legacy.media()).isNull();
        }
    }

    @Test
    void aFailedPostMayRenderAgainSoTheAdminCanFixItsMedia() {
        SocialPost failed = stored(SocialPostStatus.FAILED, READY);

        failed.requestNewIllustration(LATER);

        assertThat(failed.status()).isEqualTo(SocialPostStatus.FAILED);
        assertThat(failed.media().illustrationVersion()).isEqualTo(2);
        assertThat(failed.media().status()).isEqualTo(SocialPostMedia.Status.PENDING);
        assertThat(failed.prepareMedia(LATER)).isTrue();
    }

    @Test
    void editRejectAndRegenerateStillRefuseScheduledPublishedAndFailedPosts() {
        for (SocialPostStatus status : List.of(SocialPostStatus.SCHEDULED, SocialPostStatus.PUBLISHED, SocialPostStatus.FAILED)) {
            SocialPost post = stored(status, READY);
            assertThatThrownBy(() -> post.edit(PostLanguage.ES, COPIES.es(), reviewer, LATER)).as(status.name())
                    .isInstanceOf(InvalidPostTransitionException.class);
            assertThatThrownBy(() -> post.reject(reviewer, "no", LATER)).as(status.name()).isInstanceOf(InvalidPostTransitionException.class);
            assertThatThrownBy(post::requireRegenerable).as(status.name()).isInstanceOf(InvalidPostTransitionException.class);
            assertThatThrownBy(() -> post.copyGenerated(COPIES, GENERATED, LATER)).as(status.name())
                    .isInstanceOf(InvalidPostTransitionException.class);
        }
    }

    @Test
    void aHumanApprovalStillRecordsItsReviewer() {
        SocialPost post = stored(SocialPostStatus.PENDING_APPROVAL, READY);

        post.approve(reviewer, LATER);

        assertThat(post.review()).isEqualTo(new PostReview(reviewer, LATER, null, null));
        assertThat(post.review().isAutomatic()).isFalse();
    }

    private SocialPost scheduled() {
        SocialPost post = stored(SocialPostStatus.APPROVED, READY);
        post.startPublishing(START);
        return post;
    }

    private SocialPost stored(SocialPostStatus status, SocialPostMedia media) {
        return SocialPost.restore(UUID.randomUUID(), status, SLOT, "CURIOUS_FACT", null, COPIES, GENERATED,
                new PostReview(reviewer, LATER, null, null), media, null, PLANNED_AT, PLANNED_AT);
    }
}
