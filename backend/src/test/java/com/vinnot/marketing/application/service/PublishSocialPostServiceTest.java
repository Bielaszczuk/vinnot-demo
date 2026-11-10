package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.exception.SocialPublishingException;
import com.vinnot.marketing.application.model.PublishRequest;
import com.vinnot.marketing.application.model.PublishResult;
import com.vinnot.marketing.application.model.PublishingSettings;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.application.port.out.SocialPublicationRepository;
import com.vinnot.marketing.application.port.out.SocialPublisher;
import com.vinnot.marketing.application.port.out.SocialPublishingNotices;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.PublicationStatus;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.marketing.domain.model.SocialPublication;
import com.vinnot.marketing.domain.service.NetworkCaptionFormatter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static com.vinnot.marketing.application.service.MarketingFixtures.NOW;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * #510 S2/S3/S4: a queued publication is claimed, published with the network's caption and the Spanish slides, retried while
 * the failure is transient (at most five attempts) and settles the post once every network is done.
 */
class PublishSocialPostServiceTest {
    private static final Instant LATER = NOW.plusSeconds(120);
    private final SocialPublicationRepository publications = mock(SocialPublicationRepository.class);
    private final SocialPostRepository posts = mock(SocialPostRepository.class);
    private final SocialPublishingNotices notices = mock(SocialPublishingNotices.class);
    private final Map<SocialNetwork, SocialPublisher> publishers = new EnumMap<>(SocialNetwork.class);
    private final List<SocialPublication> stored = new ArrayList<>();
    private SocialPost post;

    @BeforeEach
    void scheduledPost() {
        post = PublishingFixtures.scheduled();
        for (SocialNetwork network : SocialNetwork.values()) {
            SocialPublisher publisher = mock(SocialPublisher.class);
            when(publisher.network()).thenReturn(network);
            publishers.put(network, publisher);
        }
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        when(posts.saveIfStatus(any(), any())).thenReturn(true);
        when(publications.findByPost(any())).thenAnswer(invocation -> List.copyOf(stored));
    }

    @Test
    void aClaimedPublicationIsPublishedWithTheNetworkCaptionAndTheInstagramSlides() {
        SocialPublication instagram = claimed(SocialNetwork.INSTAGRAM, 1);
        queued(SocialNetwork.FACEBOOK);
        when(publishers.get(SocialNetwork.INSTAGRAM).publish(any()))
                .thenReturn(new PublishResult(PublishResult.Outcome.PUBLISHED, "ig-1", "https://www.instagram.com/p/abc/"));

        service().publish(instagram.id(), LATER);

        PublishRequest request = sent(SocialNetwork.INSTAGRAM);
        NetworkCaptionFormatter.Caption expected = new NetworkCaptionFormatter().format(SocialNetwork.INSTAGRAM, post.copies().es(),
                PostLanguage.ES);
        assertThat(request.postId()).isEqualTo(post.id());
        assertThat(request.network()).isEqualTo(SocialNetwork.INSTAGRAM);
        assertThat(request.imageUrls()).containsExactly(PublishingFixtures.IG_1, PublishingFixtures.IG_2);
        assertThat(request.altText()).isEqualTo(post.copies().es().altText());
        assertThat(request.caption().text()).isEqualTo(expected.text());
        assertThat(request.caption().hashtags()).isEqualTo(expected.hashtags());
        assertThat(instagram.status()).isEqualTo(PublicationStatus.PUBLISHED);
        assertThat(instagram.externalId()).isEqualTo("ig-1");
        assertThat(instagram.permalink()).isEqualTo("https://www.instagram.com/p/abc/");
        assertThat(instagram.publishedAt()).isEqualTo(LATER);
        verify(publications).save(instagram);
        assertThat(post.status()).as("Facebook is still queued").isEqualTo(SocialPostStatus.SCHEDULED);
        verify(posts, never()).saveIfStatus(any(), any());
        verifyNoInteractions(notices);
    }

    @Test
    void aTiktokDraftUsesTheTiktokSlidesAndTellsTheAdminsAndTheLastSuccessPublishesThePost() {
        published(SocialNetwork.INSTAGRAM);
        SocialPublication tiktok = claimed(SocialNetwork.TIKTOK, 1);
        when(publishers.get(SocialNetwork.TIKTOK).publish(any())).thenReturn(new PublishResult(PublishResult.Outcome.DRAFT_SENT, "tt-1", null));

        service().publish(tiktok.id(), LATER);

        PublishRequest request = sent(SocialNetwork.TIKTOK);
        assertThat(request.imageUrls()).containsExactly(PublishingFixtures.TT_1);
        assertThat(request.caption().title()).isEqualTo(post.copies().es().hook());
        assertThat(tiktok.status()).isEqualTo(PublicationStatus.DRAFT_SENT);
        verify(notices).tiktokDraftWaiting(post);
        assertThat(post.status()).isEqualTo(SocialPostStatus.PUBLISHED);
        assertThat(post.publishing().finishedAt()).isEqualTo(LATER);
        verify(posts).saveIfStatus(post, SocialPostStatus.SCHEDULED);
        verify(notices, never()).postFailed(any(), any(), any());
    }

    @Test
    void threadsGetsOneTopicTagAndTheInstagramSlides() {
        SocialPublication threads = claimed(SocialNetwork.THREADS, 1);
        when(publishers.get(SocialNetwork.THREADS).publish(any())).thenReturn(new PublishResult(PublishResult.Outcome.PUBLISHED, "th-1", null));

        service().publish(threads.id(), LATER);

        PublishRequest request = sent(SocialNetwork.THREADS);
        assertThat(request.imageUrls()).containsExactly(PublishingFixtures.IG_1, PublishingFixtures.IG_2);
        assertThat(request.caption().topicTag()).isEqualTo("merlot");
        assertThat(request.caption().text()).startsWith(post.copies().es().hook()).endsWith(PostLanguage.ES.legalLine());
        assertThat(post.status()).isEqualTo(SocialPostStatus.PUBLISHED);
    }

    @Test
    void aTransientFailureIsQueuedAgainAndRethrownSoTheOutboxRetriesIt() {
        SocialPublication instagram = claimed(SocialNetwork.INSTAGRAM, 4);
        SocialPublishingException limited = new SocialPublishingException(SocialPublishingException.Code.RATE_LIMITED, "slow down");
        when(publishers.get(SocialNetwork.INSTAGRAM).publish(any())).thenThrow(limited);

        assertThatThrownBy(() -> service().publish(instagram.id(), LATER)).isSameAs(limited);

        assertThat(instagram.status()).isEqualTo(PublicationStatus.QUEUED);
        assertThat(instagram.error()).isEqualTo("RATE_LIMITED");
        verify(publications).save(instagram);
        assertThat(post.status()).isEqualTo(SocialPostStatus.SCHEDULED);
        verifyNoInteractions(notices);
    }

    @Test
    void theFifthTransientFailureFailsForGoodAndFailsThePostOnce() {
        published(SocialNetwork.TIKTOK);
        SocialPublication instagram = claimed(SocialNetwork.INSTAGRAM, PublishSocialPostService.MAX_ATTEMPTS);
        when(publishers.get(SocialNetwork.INSTAGRAM).publish(any()))
                .thenThrow(new SocialPublishingException(SocialPublishingException.Code.PROCESSING_TIMEOUT, "still processing"));

        service().publish(instagram.id(), LATER);

        assertThat(instagram.status()).isEqualTo(PublicationStatus.FAILED);
        assertThat(instagram.error()).isEqualTo("PROCESSING_TIMEOUT");
        assertThat(post.status()).isEqualTo(SocialPostStatus.FAILED);
        assertThat(post.publishing().error()).isEqualTo("PROCESSING_TIMEOUT");
        verify(notices).postFailed(post, SocialNetwork.INSTAGRAM, "PROCESSING_TIMEOUT");
    }

    @Test
    void aRefusedPublicationFailsAtOnce() {
        SocialPublication facebook = claimed(SocialNetwork.FACEBOOK, 1);
        when(publishers.get(SocialNetwork.FACEBOOK).publish(any()))
                .thenThrow(new SocialPublishingException(SocialPublishingException.Code.TOKEN_INVALID, "expired"));

        service().publish(facebook.id(), LATER);

        assertThat(facebook.status()).isEqualTo(PublicationStatus.FAILED);
        assertThat(facebook.error()).isEqualTo("TOKEN_INVALID");
        assertThat(post.status()).isEqualTo(SocialPostStatus.FAILED);
        verify(notices).postFailed(post, SocialNetwork.FACEBOOK, "TOKEN_INVALID");
    }

    @Test
    void anUnexpectedErrorCountsAsTheNetworkBeingUnavailable() {
        SocialPublication instagram = claimed(SocialNetwork.INSTAGRAM, 1);
        IllegalStateException boom = new IllegalStateException("socket closed");
        when(publishers.get(SocialNetwork.INSTAGRAM).publish(any())).thenThrow(boom);

        assertThatThrownBy(() -> service().publish(instagram.id(), LATER)).isInstanceOfSatisfying(SocialPublishingException.class,
                failure -> {
                    assertThat(failure.code()).isEqualTo(SocialPublishingException.Code.UNAVAILABLE);
                    assertThat(failure.getCause()).isSameAs(boom);
                });
        assertThat(instagram.status()).isEqualTo(PublicationStatus.QUEUED);
        assertThat(instagram.error()).isEqualTo("UNAVAILABLE");
    }

    @Test
    void anUnexpectedErrorOnTheLastAttemptFailsThePublicationAsUnavailable() {
        SocialPublication instagram = claimed(SocialNetwork.INSTAGRAM, PublishSocialPostService.MAX_ATTEMPTS);
        when(publishers.get(SocialNetwork.INSTAGRAM).publish(any())).thenThrow(new IllegalStateException("socket closed"));

        service().publish(instagram.id(), LATER);

        assertThat(instagram.status()).isEqualTo(PublicationStatus.FAILED);
        assertThat(instagram.error()).isEqualTo("UNAVAILABLE");
        verify(notices).postFailed(post, SocialNetwork.INSTAGRAM, "UNAVAILABLE");
    }

    @Test
    void aNetworkWithoutPublisherIsNotConnected() {
        SocialPublication threads = claimed(SocialNetwork.THREADS, 1);
        publishers.remove(SocialNetwork.THREADS);

        service().publish(threads.id(), LATER);

        assertThat(threads.status()).isEqualTo(PublicationStatus.FAILED);
        assertThat(threads.error()).isEqualTo("NOT_CONNECTED");
        verify(notices).postFailed(post, SocialNetwork.THREADS, "NOT_CONNECTED");
    }

    @Test
    void slidesWithoutAnAbsoluteHttpsUrlAreNotPublic() {
        for (String url : List.of("http://media.vinnot.com/ig-1.jpg", "/posts/p/es/ig-1.jpg", "https://bad host/ig-1.jpg", "https:///ig-1.jpg")) {
            stored.clear();
            post = PublishingFixtures.scheduled(PublishingFixtures.IG_1, url, PublishingFixtures.TT_1);
            when(posts.findById(post.id())).thenReturn(Optional.of(post));
            SocialPublication instagram = claimed(SocialNetwork.INSTAGRAM, 1);

            service().publish(instagram.id(), LATER);

            assertThat(instagram.status()).as(url).isEqualTo(PublicationStatus.FAILED);
            assertThat(instagram.error()).as(url).isEqualTo("MEDIA_NOT_PUBLIC");
        }
        verify(publishers.get(SocialNetwork.INSTAGRAM), never()).publish(any());
    }

    @Test
    void aDuplicateEffectFindsThePublicationClaimedAndDoesNothing() {
        UUID id = UUID.randomUUID();
        when(publications.claim(id, LATER)).thenReturn(false);

        service().publish(id, LATER);

        verify(publications, never()).findById(any());
        verify(publications, never()).save(any());
        publishers.values().forEach(publisher -> verify(publisher, never()).publish(any()));
        verifyNoInteractions(notices);
    }

    @Test
    void aPublicationGoneAfterTheClaimIsIgnored() {
        UUID id = UUID.randomUUID();
        when(publications.claim(id, LATER)).thenReturn(true);
        when(publications.findById(id)).thenReturn(Optional.empty());

        service().publish(id, LATER);

        verify(publications, never()).save(any());
        verifyNoInteractions(posts, notices);
    }

    @Test
    void aPublicationOfAPostNoLongerScheduledFailsWithoutPublishing() {
        SocialPost rejected = SocialPost.restore(UUID.randomUUID(), SocialPostStatus.REJECTED, post.scheduledFor(), post.pillarCode(), null,
                post.copies(), post.generation(), null, post.media(), NOW, NOW);
        when(posts.findById(rejected.id())).thenReturn(Optional.of(rejected));
        SocialPublication onRejected = claimed(rejected.id(), SocialNetwork.INSTAGRAM, 1);
        SocialPublication onMissing = claimed(UUID.randomUUID(), SocialNetwork.FACEBOOK, 1);

        service().publish(onRejected.id(), LATER);
        service().publish(onMissing.id(), LATER);

        assertThat(onRejected.status()).isEqualTo(PublicationStatus.FAILED);
        assertThat(onRejected.error()).isEqualTo(PublishSocialPostService.POST_NOT_SCHEDULED);
        assertThat(onMissing.error()).isEqualTo(PublishSocialPostService.POST_NOT_SCHEDULED);
        publishers.values().forEach(publisher -> verify(publisher, never()).publish(any()));
        verify(posts, never()).saveIfStatus(any(), any());
        verifyNoInteractions(notices);
    }

    @Test
    void aScheduledPostWhoseMediaIsNoLongerReadyFailsItsPublication() {
        SocialPost pendingMedia = SocialPost.restore(post.id(), SocialPostStatus.SCHEDULED, post.scheduledFor(), post.pillarCode(), null,
                post.copies(), post.generation(), post.review(), post.media().newIllustration(NOW), post.publishing(), NOW, NOW);
        when(posts.findById(post.id())).thenReturn(Optional.of(pendingMedia));
        SocialPublication instagram = claimed(SocialNetwork.INSTAGRAM, 1);

        service().publish(instagram.id(), LATER);

        assertThat(instagram.error()).isEqualTo(PublishSocialPostService.MEDIA_NOT_READY);
        assertThat(pendingMedia.status()).isEqualTo(SocialPostStatus.FAILED);
        verify(notices).postFailed(pendingMedia, SocialNetwork.INSTAGRAM, PublishSocialPostService.MEDIA_NOT_READY);
    }

    @Test
    void theOutcomeIsWrittenOnlyByWhoeverSettlesThePostFirst() {
        SocialPublication facebook = claimed(SocialNetwork.FACEBOOK, 1);
        when(publishers.get(SocialNetwork.FACEBOOK).publish(any()))
                .thenThrow(new SocialPublishingException(SocialPublishingException.Code.REJECTED, "policy"));
        when(posts.saveIfStatus(post, SocialPostStatus.SCHEDULED)).thenReturn(false);

        service().publish(facebook.id(), LATER);

        verify(posts).saveIfStatus(post, SocialPostStatus.SCHEDULED);
        verifyNoInteractions(notices);
    }

    @Test
    void aPostAlreadySettledIsNotSettledAgain() {
        SocialPublication instagram = claimed(SocialNetwork.INSTAGRAM, 1);
        when(publishers.get(SocialNetwork.INSTAGRAM).publish(any())).thenReturn(new PublishResult(PublishResult.Outcome.PUBLISHED, "ig-1", null));
        SocialPost settled = SocialPost.restore(post.id(), SocialPostStatus.PUBLISHED, post.scheduledFor(), post.pillarCode(), null,
                post.copies(), post.generation(), post.review(), post.media(), post.publishing(), NOW, NOW);
        when(posts.findById(post.id())).thenReturn(Optional.of(post), Optional.of(settled));

        service().publish(instagram.id(), LATER);

        assertThat(instagram.status()).isEqualTo(PublicationStatus.PUBLISHED);
        verify(posts, times(2)).findById(post.id());
        verify(posts, never()).saveIfStatus(any(), any());
    }

    private PublishSocialPostService service() {
        return service(new PublishingSettings(true, EnumSet.allOf(SocialNetwork.class), Duration.ofHours(6)));
    }

    private PublishSocialPostService service(PublishingSettings settings) {
        return new PublishSocialPostService(publications, posts, List.copyOf(publishers.values()), notices, settings);
    }

    @Test
    void whilePublishingIsOffAClaimedPublicationFailsWithoutCallingTheNetwork() {
        SocialPublication instagram = claimed(SocialNetwork.INSTAGRAM, 2);

        service(new PublishingSettings(false, EnumSet.allOf(SocialNetwork.class), Duration.ofHours(6))).publish(instagram.id(), LATER);

        assertThat(instagram.status()).isEqualTo(PublicationStatus.FAILED);
        assertThat(instagram.error()).isEqualTo(PublishSocialPostService.PUBLISHING_OFF);
        verify(publications).save(instagram);
        verify(publishers.get(SocialNetwork.INSTAGRAM), never()).publish(any());
        assertThat(post.status()).isEqualTo(SocialPostStatus.FAILED);
        verify(notices).postFailed(post, SocialNetwork.INSTAGRAM, PublishSocialPostService.PUBLISHING_OFF);
    }

    @Test
    void aPublicationOnANetworkSwitchedOffFailsWithoutCallingIt() {
        SocialPublication threads = claimed(SocialNetwork.THREADS, 1);
        queued(SocialNetwork.INSTAGRAM);

        service(new PublishingSettings(true, EnumSet.of(SocialNetwork.INSTAGRAM), Duration.ofHours(6))).publish(threads.id(), LATER);

        assertThat(threads.status()).isEqualTo(PublicationStatus.FAILED);
        assertThat(threads.error()).isEqualTo(PublishSocialPostService.PUBLISHING_OFF);
        verify(publishers.get(SocialNetwork.THREADS), never()).publish(any());
        assertThat(post.status()).as("Instagram is still queued").isEqualTo(SocialPostStatus.SCHEDULED);
    }

    private PublishRequest sent(SocialNetwork network) {
        ArgumentCaptor<PublishRequest> request = ArgumentCaptor.forClass(PublishRequest.class);
        verify(publishers.get(network)).publish(request.capture());
        return request.getValue();
    }

    private SocialPublication claimed(SocialNetwork network, int attempts) {
        return claimed(post.id(), network, attempts);
    }

    /** A publication the claim just moved to publishing, with this attempt counted. */
    private SocialPublication claimed(UUID postId, SocialNetwork network, int attempts) {
        SocialPublication publication = SocialPublication.restore(UUID.randomUUID(), postId, network, PublicationStatus.PUBLISHING, null,
                null, attempts, null, NOW, NOW, null);
        when(publications.claim(publication.id(), LATER)).thenReturn(true);
        when(publications.findById(publication.id())).thenReturn(Optional.of(publication));
        stored.add(publication);
        return publication;
    }

    private void queued(SocialNetwork network) {
        stored.add(SocialPublication.queued(UUID.randomUUID(), post.id(), network, NOW));
    }

    private void published(SocialNetwork network) {
        stored.add(SocialPublication.restore(UUID.randomUUID(), post.id(), network, PublicationStatus.PUBLISHED, "x-1", null, 1, null, NOW,
                NOW, NOW));
    }
}
