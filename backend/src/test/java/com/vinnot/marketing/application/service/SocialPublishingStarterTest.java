package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.PublishingSettings;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.application.port.out.SocialPublicationRepository;
import com.vinnot.marketing.application.port.out.SocialPublishQueue;
import com.vinnot.marketing.application.port.out.SocialPublishingNotices;
import com.vinnot.marketing.domain.model.PublicationStatus;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.marketing.domain.model.SocialPublication;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.vinnot.marketing.application.service.MarketingFixtures.TUESDAY_SLOT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * #510 S2: a due approved post starts publishing on every enabled network, or fails when its media never got ready. #513 S4: a
 * network with a not-before time waits for it on the post's day; publishing now (S6) waits for nothing.
 */
class SocialPublishingStarterTest {
    private static final Instant DUE = TUESDAY_SLOT.plusSeconds(60);
    private final SocialPostRepository posts = mock(SocialPostRepository.class);
    private final SocialPublicationRepository publications = mock(SocialPublicationRepository.class);
    private final SocialPublishQueue queue = mock(SocialPublishQueue.class);
    private final SocialPublishingNotices notices = mock(SocialPublishingNotices.class);

    private SocialPublishingStarter starter(Set<SocialNetwork> networks) {
        return new SocialPublishingStarter(posts, publications, queue, notices, new PublishingSettings(true, networks, Duration.ofHours(6)));
    }

    @Test
    void aReadyPostIsScheduledAndQueuesOnePublicationPerEnabledNetworkInNetworkOrder() {
        SocialPost post = PublishingFixtures.approved(true);
        when(posts.saveIfStatus(post, SocialPostStatus.APPROVED)).thenReturn(true);

        SocialPublishingStarter.Result result = starter(EnumSet.of(SocialNetwork.TIKTOK, SocialNetwork.INSTAGRAM, SocialNetwork.THREADS))
                .start(post, DUE);

        assertThat(result).isEqualTo(SocialPublishingStarter.Result.STARTED);
        assertThat(post.status()).isEqualTo(SocialPostStatus.SCHEDULED);
        assertThat(post.publishing().startedAt()).isEqualTo(DUE);
        ArgumentCaptor<SocialPublication> saved = ArgumentCaptor.forClass(SocialPublication.class);
        verify(publications, times(3)).save(saved.capture());
        assertThat(saved.getAllValues()).extracting(SocialPublication::network).containsExactly(SocialNetwork.INSTAGRAM,
                SocialNetwork.THREADS, SocialNetwork.TIKTOK);
        assertThat(saved.getAllValues()).allSatisfy(publication -> {
            assertThat(publication.postId()).isEqualTo(post.id());
            assertThat(publication.status()).isEqualTo(PublicationStatus.QUEUED);
            assertThat(publication.createdAt()).isEqualTo(DUE);
        });
        InOrder order = inOrder(posts, publications, queue);
        order.verify(posts).saveIfStatus(post, SocialPostStatus.APPROVED);
        for (SocialPublication publication : saved.getAllValues()) {
            order.verify(publications).save(publication);
            order.verify(queue).enqueue(publication.id(), Duration.ZERO);
        }
        verifyNoInteractions(notices);
    }

    @Test
    void aPostChangedMeanwhileIsLeftAlone() {
        SocialPost post = PublishingFixtures.approved(true);
        when(posts.saveIfStatus(post, SocialPostStatus.APPROVED)).thenReturn(false);

        assertThat(starter(EnumSet.of(SocialNetwork.INSTAGRAM)).start(post, DUE)).isEqualTo(SocialPublishingStarter.Result.SKIPPED);

        verifyNoInteractions(publications, queue, notices);
    }

    @Test
    void aPostWithoutReadyMediaWaitsWithinTheGrace() {
        SocialPost post = PublishingFixtures.approved(false);

        SocialPublishingStarter.Result result = starter(EnumSet.of(SocialNetwork.INSTAGRAM)).start(post, TUESDAY_SLOT.plus(Duration.ofHours(6)));

        assertThat(result).isEqualTo(SocialPublishingStarter.Result.WAITING_FOR_MEDIA);
        assertThat(post.status()).isEqualTo(SocialPostStatus.APPROVED);
        verify(posts, never()).saveIfStatus(any(), any());
        verifyNoInteractions(publications, queue, notices);
    }

    @Test
    void aPostWhoseMediaIsStillNotReadyAfterTheGraceFailsAndTellsTheAdmins() {
        SocialPost post = PublishingFixtures.approved(false);
        when(posts.saveIfStatus(post, SocialPostStatus.APPROVED)).thenReturn(true);
        Instant late = TUESDAY_SLOT.plus(Duration.ofHours(6)).plusSeconds(1);

        SocialPublishingStarter.Result result = starter(EnumSet.of(SocialNetwork.INSTAGRAM)).start(post, late);

        assertThat(result).isEqualTo(SocialPublishingStarter.Result.MEDIA_NOT_READY);
        assertThat(post.status()).isEqualTo(SocialPostStatus.FAILED);
        assertThat(post.publishing().error()).isEqualTo("MEDIA_NOT_READY");
        assertThat(post.publishing().startedAt()).isNull();
        verify(notices).postFailed(post, null, "MEDIA_NOT_READY");
        verifyNoInteractions(publications, queue);
    }

    @Test
    void aLateFailureLosingTheRaceNotifiesNobody() {
        SocialPost post = PublishingFixtures.approved(false);
        when(posts.saveIfStatus(post, SocialPostStatus.APPROVED)).thenReturn(false);

        SocialPublishingStarter.Result result = starter(EnumSet.of(SocialNetwork.INSTAGRAM)).start(post, TUESDAY_SLOT.plus(Duration.ofDays(1)));

        assertThat(result).isEqualTo(SocialPublishingStarter.Result.SKIPPED);
        verifyNoInteractions(notices);
    }

    @Test
    void withoutAnEnabledNetworkNothingStarts() {
        SocialPost post = PublishingFixtures.approved(true);

        assertThat(starter(Set.of()).start(post, DUE)).isEqualTo(SocialPublishingStarter.Result.SKIPPED);

        assertThat(post.status()).isEqualTo(SocialPostStatus.APPROVED);
        verifyNoInteractions(posts, publications, queue, notices);
    }

    @Test
    void onlyTheEnabledNetworksArePublished() {
        SocialPost post = PublishingFixtures.approved(true);
        when(posts.saveIfStatus(post, SocialPostStatus.APPROVED)).thenReturn(true);

        starter(EnumSet.of(SocialNetwork.FACEBOOK)).start(post, DUE);

        ArgumentCaptor<SocialPublication> saved = ArgumentCaptor.forClass(SocialPublication.class);
        verify(publications).save(saved.capture());
        assertThat(saved.getAllValues()).extracting(SocialPublication::network).isEqualTo(List.of(SocialNetwork.FACEBOOK));
    }

    @Test
    void aPostApprovedAgainReusesItsPublicationsInsteadOfInsertingDuplicates() {
        SocialPost post = PublishingFixtures.approved(true);
        SocialPublication failed = existing(post, SocialNetwork.INSTAGRAM, PublicationStatus.FAILED);
        SocialPublication queued = existing(post, SocialNetwork.FACEBOOK, PublicationStatus.QUEUED);
        SocialPublication published = existing(post, SocialNetwork.THREADS, PublicationStatus.PUBLISHED);
        when(publications.findByPost(post.id())).thenReturn(List.of(failed, queued, published));
        when(posts.saveIfStatus(post, SocialPostStatus.APPROVED)).thenReturn(true);
        when(publications.saveIfStatus(failed, PublicationStatus.FAILED)).thenReturn(true);

        SocialPublishingStarter.Result result = starter(EnumSet.allOf(SocialNetwork.class)).start(post, DUE);

        assertThat(result).isEqualTo(SocialPublishingStarter.Result.STARTED);
        assertThat(failed.status()).isEqualTo(PublicationStatus.QUEUED);
        verify(publications).saveIfStatus(failed, PublicationStatus.FAILED);
        verify(queue).enqueue(failed.id(), Duration.ZERO);
        verify(queue).enqueue(queued.id(), Duration.ZERO);
        verify(queue, never()).enqueue(eq(published.id()), any());
        ArgumentCaptor<SocialPublication> inserted = ArgumentCaptor.forClass(SocialPublication.class);
        verify(publications).save(inserted.capture());
        assertThat(inserted.getValue().network()).as("only the network without a publication gets a new one").isEqualTo(SocialNetwork.TIKTOK);
        verify(queue).enqueue(inserted.getValue().id(), Duration.ZERO);
        assertThat(published.status()).isEqualTo(PublicationStatus.PUBLISHED);
    }

    @Test
    void aFailedPublicationRetriedMeanwhileIsNotQueuedTwice() {
        SocialPost post = PublishingFixtures.approved(true);
        SocialPublication failed = existing(post, SocialNetwork.INSTAGRAM, PublicationStatus.FAILED);
        when(publications.findByPost(post.id())).thenReturn(List.of(failed));
        when(posts.saveIfStatus(post, SocialPostStatus.APPROVED)).thenReturn(true);
        when(publications.saveIfStatus(failed, PublicationStatus.FAILED)).thenReturn(false);

        assertThat(starter(EnumSet.of(SocialNetwork.INSTAGRAM)).start(post, DUE)).isEqualTo(SocialPublishingStarter.Result.STARTED);

        verify(publications, never()).save(any());
        verifyNoInteractions(queue);
    }

    @Test
    void aNetworkWithANotBeforeTimeWaitsForItOnThePostsDayAndTheOthersGoAtOnce() {
        SocialPost post = PublishingFixtures.approved(true);
        when(posts.saveIfStatus(post, SocialPostStatus.APPROVED)).thenReturn(true);

        assertThat(tiktokEvening().start(post, DUE)).isEqualTo(SocialPublishingStarter.Result.STARTED);

        Map<SocialNetwork, Duration> delays = queuedDelays(2);
        assertThat(delays).as("the Tuesday post is at 19:00 in Argentina, started a minute later").containsExactlyInAnyOrderEntriesOf(Map.of(
                SocialNetwork.INSTAGRAM, Duration.ZERO, SocialNetwork.TIKTOK, Duration.ofMinutes(29)));
        assertThat(post.status()).as("the post stays scheduled until every network is done").isEqualTo(SocialPostStatus.SCHEDULED);
    }

    @Test
    void aNotBeforeTimeThatAlreadyPassedDoesNotDelay() {
        SocialPost post = PublishingFixtures.approved(true);
        when(posts.saveIfStatus(post, SocialPostStatus.APPROVED)).thenReturn(true);

        tiktokEvening().start(post, TUESDAY_SLOT.plus(Duration.ofHours(1)));

        assertThat(queuedDelays(2)).containsOnlyKeys(SocialNetwork.INSTAGRAM, SocialNetwork.TIKTOK).allSatisfy((network, delay) ->
                assertThat(delay).isZero());
    }

    @Test
    void publishingNowQueuesEveryNetworkWithoutItsNotBeforeWait() {
        SocialPost post = PublishingFixtures.approved(true);
        when(posts.saveIfStatus(post, SocialPostStatus.APPROVED)).thenReturn(true);

        assertThat(tiktokEvening().startNow(post, DUE)).isEqualTo(SocialPublishingStarter.Result.STARTED);

        assertThat(queuedDelays(2)).containsOnlyKeys(SocialNetwork.INSTAGRAM, SocialNetwork.TIKTOK).allSatisfy((network, delay) ->
                assertThat(delay).isZero());
        assertThat(post.status()).isEqualTo(SocialPostStatus.SCHEDULED);
    }

    private SocialPublishingStarter tiktokEvening() {
        return new SocialPublishingStarter(posts, publications, queue, notices, new PublishingSettings(true,
                EnumSet.of(SocialNetwork.INSTAGRAM, SocialNetwork.TIKTOK), Duration.ofHours(6),
                ZoneId.of("America/Argentina/Buenos_Aires"), Map.of(SocialNetwork.TIKTOK, LocalTime.of(19, 30))));
    }

    /** The delay each saved publication was queued with, by network. */
    private Map<SocialNetwork, Duration> queuedDelays(int count) {
        ArgumentCaptor<SocialPublication> saved = ArgumentCaptor.forClass(SocialPublication.class);
        verify(publications, times(count)).save(saved.capture());
        ArgumentCaptor<UUID> ids = ArgumentCaptor.forClass(UUID.class);
        ArgumentCaptor<Duration> delays = ArgumentCaptor.forClass(Duration.class);
        verify(queue, times(count)).enqueue(ids.capture(), delays.capture());
        Map<UUID, SocialNetwork> networks = saved.getAllValues().stream()
                .collect(Collectors.toMap(SocialPublication::id, SocialPublication::network));
        Map<SocialNetwork, Duration> byNetwork = new EnumMap<>(SocialNetwork.class);
        for (int index = 0; index < ids.getAllValues().size(); index++) {
            byNetwork.put(networks.get(ids.getAllValues().get(index)), delays.getAllValues().get(index));
        }
        return byNetwork;
    }

    private static SocialPublication existing(SocialPost post, SocialNetwork network, PublicationStatus status) {
        boolean succeeded = status.succeeded();
        return SocialPublication.restore(UUID.randomUUID(), post.id(), network, status, succeeded ? "x-1" : null, null, 1,
                status == PublicationStatus.FAILED ? "TOKEN_INVALID" : null, DUE, DUE, succeeded ? DUE : null);
    }
}
