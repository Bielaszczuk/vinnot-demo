package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.exception.SocialPublishingOffException;
import com.vinnot.marketing.application.model.PublishingSettings;
import com.vinnot.marketing.application.model.SocialPostAdminResponse;
import com.vinnot.marketing.application.port.out.ContentPillarCatalog;
import com.vinnot.marketing.application.port.out.SocialMetricsRepository;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.application.port.out.SocialPublicationRepository;
import com.vinnot.marketing.application.port.out.SocialPublishQueue;
import com.vinnot.marketing.application.port.out.WineDayCatalog;
import com.vinnot.marketing.domain.exception.InvalidPostTransitionException;
import com.vinnot.marketing.domain.exception.InvalidPublicationTransitionException;
import com.vinnot.marketing.domain.model.PublicationStatus;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.marketing.domain.model.SocialPublication;
import com.vinnot.marketing.domain.service.WeeklyPlanner;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static com.vinnot.marketing.application.service.MarketingFixtures.NOW;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** #510 S3: the admin retries a failed network; a failed post starts publishing again, anything else conflicts. */
class SocialPublicationRetryServiceTest {
    private static final Instant LATER = NOW.plusSeconds(600);
    private final SocialPostRepository posts = mock(SocialPostRepository.class);
    private final SocialPublicationRepository publications = mock(SocialPublicationRepository.class);
    private final SocialPublishQueue queue = mock(SocialPublishQueue.class);
    private final ContentPillarCatalog pillars = mock(ContentPillarCatalog.class);
    private final WineDayCatalog wineDays = mock(WineDayCatalog.class);
    private final SocialPostPresenter presenter = new SocialPostPresenter(pillars, wineDays, WeeklyPlanner.Settings.defaults(),
            ids -> Map.of(), publications, mock(SocialMetricsRepository.class), PublishingFixtures.SETTINGS);
    private final SocialPublicationRetryService service = service(new PublishingSettings(true, EnumSet.allOf(SocialNetwork.class),
            Duration.ofHours(6)));

    @BeforeEach
    void catalogs() {
        when(pillars.all()).thenReturn(MarketingFixtures.PILLARS);
        when(wineDays.all()).thenReturn(List.of());
        when(publications.saveIfStatus(any(), eq(PublicationStatus.FAILED))).thenReturn(true);
    }

    private SocialPublicationRetryService service(PublishingSettings settings) {
        return new SocialPublicationRetryService(posts, publications, queue, presenter, settings);
    }

    @Test
    void retryingAFailedNetworkOfAFailedPostQueuesItAndSchedulesThePostAgain() {
        SocialPost post = failedPost();
        SocialPublication instagram = publication(post, SocialNetwork.INSTAGRAM, PublicationStatus.FAILED);
        SocialPublication tiktok = publication(post, SocialNetwork.TIKTOK, PublicationStatus.DRAFT_SENT);
        when(publications.findByPost(post.id())).thenReturn(List.of(instagram, tiktok));
        when(posts.saveIfStatus(post, SocialPostStatus.FAILED)).thenReturn(true);

        SocialPostAdminResponse response = service.retry(post.id(), SocialNetwork.INSTAGRAM, LATER);

        assertThat(instagram.status()).isEqualTo(PublicationStatus.QUEUED);
        assertThat(instagram.attempts()).isZero();
        assertThat(instagram.error()).isNull();
        assertThat(post.status()).isEqualTo(SocialPostStatus.SCHEDULED);
        assertThat(response.status()).isEqualTo(SocialPostStatus.SCHEDULED);
        assertThat(response.publications()).extracting(SocialPostAdminResponse.Publication::status)
                .containsExactly(PublicationStatus.QUEUED, PublicationStatus.DRAFT_SENT);
        verify(publications).saveIfStatus(instagram, PublicationStatus.FAILED);
        verify(publications, never()).save(any());
        verify(queue).enqueue(instagram.id());
    }

    @Test
    void retryingAFailedNetworkWhileOthersStillPublishLeavesThePostScheduled() {
        SocialPost post = PublishingFixtures.scheduled();
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        SocialPublication threads = publication(post, SocialNetwork.THREADS, PublicationStatus.FAILED);
        when(publications.findByPost(post.id())).thenReturn(List.of(publication(post, SocialNetwork.INSTAGRAM, PublicationStatus.QUEUED),
                threads));

        service.retry(post.id(), SocialNetwork.THREADS, LATER);

        assertThat(post.status()).isEqualTo(SocialPostStatus.SCHEDULED);
        verify(posts, never()).saveIfStatus(any(), any());
        verify(queue).enqueue(threads.id());
    }

    @Test
    void onlyAFailedPublicationCanBeRetried() {
        SocialPost post = PublishingFixtures.scheduled();
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        when(publications.findByPost(post.id())).thenReturn(List.of(publication(post, SocialNetwork.INSTAGRAM, PublicationStatus.PUBLISHED)));

        assertThatThrownBy(() -> service.retry(post.id(), SocialNetwork.INSTAGRAM, LATER))
                .isInstanceOf(InvalidPublicationTransitionException.class);

        verify(publications, never()).saveIfStatus(any(), any());
        verifyNoInteractions(queue);
    }

    @Test
    void aFailedPostChangedMeanwhileConflictsAndQueuesNothing() {
        SocialPost post = failedPost();
        when(publications.findByPost(post.id())).thenReturn(List.of(publication(post, SocialNetwork.INSTAGRAM, PublicationStatus.FAILED)));
        when(posts.saveIfStatus(post, SocialPostStatus.FAILED)).thenReturn(false);

        assertThatThrownBy(() -> service.retry(post.id(), SocialNetwork.INSTAGRAM, LATER))
                .isInstanceOf(InvalidPostTransitionException.class);

        verify(publications, never()).saveIfStatus(any(), any());
        verifyNoInteractions(queue);
    }

    @Test
    void ofTwoConcurrentRetriesOnlyOneQueuesThePublication() {
        SocialPost post = PublishingFixtures.scheduled();
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        SocialPublication threads = publication(post, SocialNetwork.THREADS, PublicationStatus.FAILED);
        when(publications.findByPost(post.id())).thenReturn(List.of(threads));
        when(publications.saveIfStatus(threads, PublicationStatus.FAILED)).thenReturn(false);

        assertThatThrownBy(() -> service.retry(post.id(), SocialNetwork.THREADS, LATER))
                .isInstanceOfSatisfying(InvalidPublicationTransitionException.class,
                        conflict -> assertThat(conflict.getCode()).isEqualTo("INVALID_PUBLICATION_TRANSITION"));

        verifyNoInteractions(queue);
    }

    @Test
    void aRetryWhilePublishingOrTheNetworkIsOffConflictsAndChangesNothing() {
        SocialPost post = failedPost();
        when(publications.findByPost(post.id())).thenReturn(List.of(publication(post, SocialNetwork.INSTAGRAM, PublicationStatus.FAILED)));
        SocialPublicationRetryService publishingOff = service(new PublishingSettings(false, EnumSet.allOf(SocialNetwork.class),
                Duration.ofHours(6)));
        SocialPublicationRetryService networkOff = service(new PublishingSettings(true, EnumSet.of(SocialNetwork.FACEBOOK),
                Duration.ofHours(6)));

        assertThatThrownBy(() -> publishingOff.retry(post.id(), SocialNetwork.INSTAGRAM, LATER))
                .isInstanceOfSatisfying(SocialPublishingOffException.class,
                        off -> assertThat(off.getCode()).isEqualTo("SOCIAL_PUBLISHING_OFF"));
        assertThatThrownBy(() -> networkOff.retry(post.id(), SocialNetwork.INSTAGRAM, LATER))
                .isInstanceOf(SocialPublishingOffException.class);

        assertThat(post.status()).isEqualTo(SocialPostStatus.FAILED);
        verify(posts, never()).saveIfStatus(any(), any());
        verify(publications, never()).saveIfStatus(any(), any());
        verifyNoInteractions(queue);
    }

    @Test
    void anUnknownPostOrNetworkIsNotFound() {
        SocialPost post = failedPost();
        when(publications.findByPost(post.id())).thenReturn(List.of(publication(post, SocialNetwork.INSTAGRAM, PublicationStatus.FAILED)));

        assertThatThrownBy(() -> service.retry(post.id(), SocialNetwork.FACEBOOK, LATER)).isInstanceOf(EntityNotFoundException.class);
        assertThatThrownBy(() -> service.retry(UUID.randomUUID(), SocialNetwork.INSTAGRAM, LATER))
                .isInstanceOf(EntityNotFoundException.class);
        verifyNoInteractions(queue);
    }

    private SocialPost failedPost() {
        SocialPost post = PublishingFixtures.scheduled();
        post.publishingFailed("TOKEN_INVALID", NOW.plusSeconds(60));
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        return post;
    }

    private static SocialPublication publication(SocialPost post, SocialNetwork network, PublicationStatus status) {
        boolean succeeded = status.succeeded();
        return SocialPublication.restore(UUID.randomUUID(), post.id(), network, status, succeeded ? "x-1" : null, null, 5,
                status == PublicationStatus.FAILED ? "TOKEN_INVALID" : null, NOW, NOW, succeeded ? NOW : null);
    }
}
