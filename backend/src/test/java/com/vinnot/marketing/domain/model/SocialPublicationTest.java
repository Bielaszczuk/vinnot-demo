package com.vinnot.marketing.domain.model;

import com.vinnot.marketing.domain.exception.InvalidPublicationTransitionException;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** #510 S3: one publication per post and network, with its own status, attempts, error and link. */
class SocialPublicationTest {
    private static final Instant NOW = Instant.parse("2026-11-03T22:00:00Z");
    private static final Instant LATER = NOW.plusSeconds(60);
    private static final UUID POST = UUID.randomUUID();

    @Test
    void aNewPublicationIsQueuedWithoutAttempts() {
        UUID id = UUID.randomUUID();
        SocialPublication publication = SocialPublication.queued(id, POST, SocialNetwork.INSTAGRAM, NOW);

        assertThat(publication.id()).isEqualTo(id);
        assertThat(publication.postId()).isEqualTo(POST);
        assertThat(publication.network()).isEqualTo(SocialNetwork.INSTAGRAM);
        assertThat(publication.status()).isEqualTo(PublicationStatus.QUEUED);
        assertThat(publication.attempts()).isZero();
        assertThat(publication.externalId()).isNull();
        assertThat(publication.permalink()).isNull();
        assertThat(publication.error()).isNull();
        assertThat(publication.publishedAt()).isNull();
        assertThat(publication.createdAt()).isEqualTo(NOW);
        assertThat(publication.updatedAt()).isEqualTo(NOW);
    }

    @Test
    void startingCountsAnAttempt() {
        SocialPublication publication = queued();

        publication.started(LATER);

        assertThat(publication.status()).isEqualTo(PublicationStatus.PUBLISHING);
        assertThat(publication.attempts()).isEqualTo(1);
        assertThat(publication.updatedAt()).isEqualTo(LATER);
    }

    @Test
    void onlyAQueuedPublicationStarts() {
        for (PublicationStatus status : EnumSet.complementOf(EnumSet.of(PublicationStatus.QUEUED))) {
            SocialPublication publication = stored(status);
            assertThatThrownBy(() -> publication.started(LATER)).as(status.name())
                    .isInstanceOf(InvalidPublicationTransitionException.class).hasMessageContaining(status.name());
            assertThat(publication.attempts()).isEqualTo(2);
        }
    }

    @Test
    void aPublishedPublicationKeepsItsNetworkIdAndLink() {
        SocialPublication publication = publishing();

        publication.published("17890", "https://www.instagram.com/p/abc/", LATER);

        assertThat(publication.status()).isEqualTo(PublicationStatus.PUBLISHED);
        assertThat(publication.externalId()).isEqualTo("17890");
        assertThat(publication.permalink()).isEqualTo("https://www.instagram.com/p/abc/");
        assertThat(publication.publishedAt()).isEqualTo(LATER);
        assertThat(publication.updatedAt()).isEqualTo(LATER);
    }

    @Test
    void aTiktokDraftKeepsItsNetworkIdWithoutALink() {
        SocialPublication publication = publishing();

        publication.draftSent("v_inbox_1", LATER);

        assertThat(publication.status()).isEqualTo(PublicationStatus.DRAFT_SENT);
        assertThat(publication.externalId()).isEqualTo("v_inbox_1");
        assertThat(publication.permalink()).isNull();
        assertThat(publication.publishedAt()).isEqualTo(LATER);
    }

    @Test
    void onlyAPublishingPublicationSucceeds() {
        for (PublicationStatus status : EnumSet.complementOf(EnumSet.of(PublicationStatus.PUBLISHING))) {
            SocialPublication publication = stored(status);
            assertThatThrownBy(() -> publication.published("1", null, LATER)).as(status.name())
                    .isInstanceOf(InvalidPublicationTransitionException.class);
            assertThatThrownBy(() -> publication.draftSent("1", LATER)).as(status.name())
                    .isInstanceOf(InvalidPublicationTransitionException.class);
            assertThat(publication.status()).isEqualTo(status);
        }
        assertThatThrownBy(() -> publishing().published(null, null, LATER)).isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> publishing().draftSent(null, LATER)).isInstanceOf(NullPointerException.class);
    }

    @Test
    void aTiktokDraftTheCreatorPostedIsPublishedKeepingItsNetworkIdAndTheLink() {
        SocialPublication publication = publishing();
        publication.draftSent("v_inbox_1", LATER);
        Instant posted = LATER.plusSeconds(3_600);

        publication.draftPosted("https://www.tiktok.com/@vinnot/photo/7311", posted);

        assertThat(publication.status()).isEqualTo(PublicationStatus.PUBLISHED);
        assertThat(publication.externalId()).isEqualTo("v_inbox_1");
        assertThat(publication.permalink()).isEqualTo("https://www.tiktok.com/@vinnot/photo/7311");
        assertThat(publication.publishedAt()).isEqualTo(posted);
        assertThat(publication.updatedAt()).isEqualTo(posted);
        assertThat(publication.error()).isNull();
        assertThat(publication.attempts()).isEqualTo(1);
    }

    @Test
    void aPostedDraftMayHaveNoLinkYet() {
        SocialPublication publication = stored(PublicationStatus.DRAFT_SENT);

        publication.draftPosted(null, LATER);

        assertThat(publication.status()).isEqualTo(PublicationStatus.PUBLISHED);
        assertThat(publication.permalink()).isNull();
        assertThat(publication.publishedAt()).isEqualTo(LATER);
    }

    @Test
    void onlyASentDraftCanBePosted() {
        for (PublicationStatus status : EnumSet.complementOf(EnumSet.of(PublicationStatus.DRAFT_SENT))) {
            SocialPublication publication = stored(status);
            assertThatThrownBy(() -> publication.draftPosted(null, LATER)).as(status.name())
                    .isInstanceOf(InvalidPublicationTransitionException.class).hasMessageContaining(status.name());
            assertThat(publication.status()).isEqualTo(status);
            assertThat(publication.updatedAt()).isEqualTo(NOW);
        }
    }

    @Test
    void aQueuedOrPublishingPublicationFailsForGood() {
        for (SocialPublication publication : new SocialPublication[] {queued(), publishing()}) {
            publication.failed("MEDIA_NOT_READY", LATER);
            assertThat(publication.status()).isEqualTo(PublicationStatus.FAILED);
            assertThat(publication.error()).isEqualTo("MEDIA_NOT_READY");
            assertThat(publication.updatedAt()).isEqualTo(LATER);
        }
        for (PublicationStatus status : Set.of(PublicationStatus.PUBLISHED, PublicationStatus.DRAFT_SENT, PublicationStatus.FAILED)) {
            SocialPublication publication = stored(status);
            assertThatThrownBy(() -> publication.failed("REJECTED", LATER)).as(status.name())
                    .isInstanceOf(InvalidPublicationTransitionException.class);
        }
        assertThatThrownBy(() -> queued().failed(null, LATER)).isInstanceOf(NullPointerException.class);
    }

    @Test
    void aTransientFailureQueuesThePublicationAgainKeepingTheError() {
        SocialPublication publication = publishing();

        publication.retryLater("RATE_LIMITED", LATER);

        assertThat(publication.status()).isEqualTo(PublicationStatus.QUEUED);
        assertThat(publication.error()).isEqualTo("RATE_LIMITED");
        assertThat(publication.attempts()).as("the attempt stays counted").isEqualTo(1);
        assertThat(publication.updatedAt()).isEqualTo(LATER);

        for (PublicationStatus status : EnumSet.complementOf(EnumSet.of(PublicationStatus.PUBLISHING))) {
            SocialPublication other = stored(status);
            assertThatThrownBy(() -> other.retryLater("UNAVAILABLE", LATER)).as(status.name())
                    .isInstanceOf(InvalidPublicationTransitionException.class);
        }
        assertThatThrownBy(() -> publishing().retryLater(null, LATER)).isInstanceOf(NullPointerException.class);
    }

    @Test
    void aFailedPublicationIsQueuedAgainOnRetryWithoutItsError() {
        SocialPublication publication = publishing();
        publication.failed("TOKEN_INVALID", LATER);

        publication.retry(LATER.plusSeconds(60));

        assertThat(publication.status()).isEqualTo(PublicationStatus.QUEUED);
        assertThat(publication.error()).isNull();
        // The attempts start over, so the publishing service's attempt cap applies to the retry again.
        assertThat(publication.attempts()).isZero();
        assertThat(publication.updatedAt()).isEqualTo(LATER.plusSeconds(60));

        for (PublicationStatus status : EnumSet.complementOf(EnumSet.of(PublicationStatus.FAILED))) {
            SocialPublication other = stored(status);
            assertThatThrownBy(() -> other.retry(LATER)).as(status.name()).isInstanceOf(InvalidPublicationTransitionException.class);
        }
    }

    @Test
    void aStoredPublicationRestoresEveryField() {
        UUID id = UUID.randomUUID();
        SocialPublication publication = SocialPublication.restore(id, POST, SocialNetwork.THREADS, PublicationStatus.PUBLISHED, "t-1",
                "https://www.threads.net/@vinnot/post/x", 2, "UNAVAILABLE", NOW, LATER, LATER);

        assertThat(publication.id()).isEqualTo(id);
        assertThat(publication.network()).isEqualTo(SocialNetwork.THREADS);
        assertThat(publication.status()).isEqualTo(PublicationStatus.PUBLISHED);
        assertThat(publication.externalId()).isEqualTo("t-1");
        assertThat(publication.permalink()).isEqualTo("https://www.threads.net/@vinnot/post/x");
        assertThat(publication.attempts()).isEqualTo(2);
        assertThat(publication.error()).isEqualTo("UNAVAILABLE");
        assertThat(publication.createdAt()).isEqualTo(NOW);
        assertThat(publication.updatedAt()).isEqualTo(LATER);
        assertThat(publication.publishedAt()).isEqualTo(LATER);
        assertThatThrownBy(() -> SocialPublication.restore(id, POST, SocialNetwork.THREADS, PublicationStatus.QUEUED, null, null, -1,
                null, NOW, NOW, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SocialPublication.queued(id, null, SocialNetwork.TIKTOK, NOW)).isInstanceOf(NullPointerException.class);
    }

    @Test
    void theStatusTellsWhetherItSucceededAndWhetherItIsOver() {
        assertThat(EnumSet.allOf(PublicationStatus.class).stream().filter(PublicationStatus::succeeded))
                .containsExactlyInAnyOrder(PublicationStatus.PUBLISHED, PublicationStatus.DRAFT_SENT);
        assertThat(EnumSet.allOf(PublicationStatus.class).stream().filter(PublicationStatus::terminal))
                .containsExactlyInAnyOrder(PublicationStatus.PUBLISHED, PublicationStatus.DRAFT_SENT, PublicationStatus.FAILED);
        assertThat(new InvalidPublicationTransitionException(PublicationStatus.FAILED, "start").getCode())
                .isEqualTo(InvalidPublicationTransitionException.CODE);
    }

    private static SocialPublication queued() {
        return SocialPublication.queued(UUID.randomUUID(), POST, SocialNetwork.FACEBOOK, NOW);
    }

    private static SocialPublication publishing() {
        SocialPublication publication = queued();
        publication.started(NOW);
        return publication;
    }

    private static SocialPublication stored(PublicationStatus status) {
        return SocialPublication.restore(UUID.randomUUID(), POST, SocialNetwork.FACEBOOK, status, null, null, 2, null, NOW, NOW, null);
    }
}
