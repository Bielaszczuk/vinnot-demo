package com.vinnot.marketing.domain.model;

import com.vinnot.marketing.domain.exception.InvalidPostTransitionException;
import com.vinnot.marketing.domain.exception.SocialPostMediaNotReadyException;
import com.vinnot.marketing.domain.exception.SocialPostScheduleNotFutureException;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * #513 S5 and S6: the admin moves a post that has not started publishing to a future date and time, keeping its status, and
 * publishes an approved post with ready media now.
 */
class SocialPostScheduleTest {
    private static final Instant PLANNED_AT = Instant.parse("2026-11-02T12:00:00Z");
    private static final Instant SLOT = Instant.parse("2026-11-03T15:30:00Z");
    private static final Instant NOW = Instant.parse("2026-11-03T10:00:00Z");
    private static final Instant LATER = Instant.parse("2026-11-09T12:30:00Z");
    private static final Set<SocialPostStatus> RESCHEDULABLE = EnumSet.of(SocialPostStatus.DRAFT, SocialPostStatus.PENDING_APPROVAL,
            SocialPostStatus.APPROVED, SocialPostStatus.REJECTED);
    private static final List<PostCopy.Slide> SLIDES = List.of(new PostCopy.Slide("Uno", "a"), new PostCopy.Slide("Dos", "b"),
            new PostCopy.Slide("Tres", "c"));
    private static final PostCopies COPIES = new PostCopies(
            PostCopy.of(PostLanguage.ES, "Hola", SLIDES, "Texto", List.of("#vinnot", "#malbec", "#vino", "#cata", "#tinto"), "Alt", "¿Y tú?"),
            PostCopy.of(PostLanguage.EN, "Hello", SLIDES, "Text", List.of("#vinnot", "#malbec", "#wine", "#tasting", "#red"), "Alt",
                    "And you?"));
    private static final SocialPostMedia.SlideImages BOTH_FORMATS = new SocialPostMedia.SlideImages(
            List.of(new SocialPostMedia.Image("posts/p/es/instagram-01.jpg", "https://cdn/ig-1.jpg")),
            List.of(new SocialPostMedia.Image("posts/p/es/tiktok-01.jpg", "https://cdn/tt-1.jpg")));
    private static final SocialPostMedia READY = SocialPostMedia.pending(COPIES.mediaHashes(), 1, PLANNED_AT)
            .rendered(Map.of(PostLanguage.ES, BOTH_FORMATS, PostLanguage.EN, BOTH_FORMATS), PLANNED_AT);

    @Test
    void aPostThatDidNotStartPublishingMovesToAFutureTimeAndKeepsItsStatus() {
        for (SocialPostStatus status : RESCHEDULABLE) {
            SocialPost post = stored(status, READY);
            assertThat(post.canReschedule()).as(status.name()).isTrue();

            post.reschedule(LATER, NOW);

            assertThat(post.scheduledFor()).as(status.name()).isEqualTo(LATER);
            assertThat(post.status()).as(status.name()).isEqualTo(status);
            assertThat(post.updatedAt()).as(status.name()).isEqualTo(NOW);
            assertThat(post.media()).as(status.name()).isEqualTo(READY);
        }
    }

    @Test
    void aPostThatStartedOrEndedPublishingCannotBeRescheduled() {
        for (SocialPostStatus status : EnumSet.complementOf(EnumSet.copyOf(RESCHEDULABLE))) {
            SocialPost post = stored(status, READY);
            assertThat(post.canReschedule()).as(status.name()).isFalse();

            assertThatThrownBy(() -> post.reschedule(LATER, NOW)).as(status.name()).isInstanceOf(InvalidPostTransitionException.class)
                    .hasFieldOrPropertyWithValue("code", "INVALID_POST_TRANSITION");
            assertThat(post.scheduledFor()).isEqualTo(SLOT);
        }
    }

    @Test
    void theNewTimeMustBeInTheFuture() {
        SocialPost post = stored(SocialPostStatus.APPROVED, READY);

        for (Instant notFuture : List.of(NOW, NOW.minusSeconds(60))) {
            assertThatThrownBy(() -> post.reschedule(notFuture, NOW)).isInstanceOf(SocialPostScheduleNotFutureException.class)
                    .hasFieldOrPropertyWithValue("code", "SOCIAL_POST_SCHEDULE_NOT_FUTURE");
        }
        assertThat(post.scheduledFor()).isEqualTo(SLOT);
        assertThat(post.updatedAt()).isEqualTo(PLANNED_AT);
    }

    @Test
    void theNewTimeIsKeptToTheSecond() {
        SocialPost post = stored(SocialPostStatus.PENDING_APPROVAL, READY);

        post.reschedule(Instant.parse("2026-11-09T12:30:15.123456789Z"), NOW);

        assertThat(post.scheduledFor()).isEqualTo(Instant.parse("2026-11-09T12:30:15Z"));
    }

    @Test
    void anApprovedPostWithReadyMediaIsPublishedNowAndStartsPublishingAtOnce() {
        SocialPost post = stored(SocialPostStatus.APPROVED, READY);
        assertThat(post.publishableNow()).isTrue();

        post.publishNow(Instant.parse("2026-11-03T10:00:00.987654321Z"));

        assertThat(post.scheduledFor()).isEqualTo(NOW);
        assertThat(post.status()).as("the publishing start schedules it").isEqualTo(SocialPostStatus.APPROVED);
        post.startPublishing(NOW);
        assertThat(post.status()).isEqualTo(SocialPostStatus.SCHEDULED);
    }

    @Test
    void onlyAnApprovedPostIsPublishedNow() {
        for (SocialPostStatus status : EnumSet.complementOf(EnumSet.of(SocialPostStatus.APPROVED))) {
            SocialPost post = stored(status, READY);
            assertThat(post.publishableNow()).as(status.name()).isFalse();

            assertThatThrownBy(() -> post.publishNow(NOW)).as(status.name()).isInstanceOf(InvalidPostTransitionException.class);
            assertThat(post.scheduledFor()).isEqualTo(SLOT);
        }
    }

    @Test
    void publishingNowNeedsReadyMedia() {
        SocialPost post = stored(SocialPostStatus.APPROVED, SocialPostMedia.pending(COPIES.mediaHashes(), 1, PLANNED_AT));
        assertThat(post.publishableNow()).isFalse();

        assertThatThrownBy(() -> post.publishNow(NOW)).isInstanceOf(SocialPostMediaNotReadyException.class)
                .hasFieldOrPropertyWithValue("code", "SOCIAL_POST_MEDIA_NOT_READY");
        assertThat(post.scheduledFor()).isEqualTo(SLOT);
        assertThat(post.status()).isEqualTo(SocialPostStatus.APPROVED);
    }

    private static SocialPost stored(SocialPostStatus status, SocialPostMedia media) {
        return SocialPost.restore(UUID.randomUUID(), status, SLOT, "CURIOUS_FACT", null, COPIES, GenerationInfo.none(),
                new PostReview(UUID.randomUUID(), PLANNED_AT, null, null), media, null, PLANNED_AT, PLANNED_AT);
    }
}
