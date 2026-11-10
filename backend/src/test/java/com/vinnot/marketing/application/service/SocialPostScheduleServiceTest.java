package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.exception.SocialPostDateTakenException;
import com.vinnot.marketing.application.exception.SocialPublishingOffException;
import com.vinnot.marketing.application.model.PublishingSettings;
import com.vinnot.marketing.application.model.SocialPostAdminResponse;
import com.vinnot.marketing.application.port.out.ContentPillarCatalog;
import com.vinnot.marketing.application.port.out.SocialMetricsRepository;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.application.port.out.SocialPublicationRepository;
import com.vinnot.marketing.application.port.out.SocialPublishQueue;
import com.vinnot.marketing.application.port.out.SocialPublishingNotices;
import com.vinnot.marketing.application.port.out.WineDayCatalog;
import com.vinnot.marketing.domain.exception.InvalidPostTransitionException;
import com.vinnot.marketing.domain.exception.SocialPostMediaNotReadyException;
import com.vinnot.marketing.domain.exception.SocialPostScheduleNotFutureException;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.marketing.domain.model.SocialPublication;
import com.vinnot.marketing.domain.service.WeeklyPlanner;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static com.vinnot.marketing.application.service.MarketingFixtures.TUESDAY_SLOT;
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
 * #513 S5: the admin moves a post to another future date and time, one post per Argentina date, written only over the status
 * and slot read. S6: an approved post with ready media publishes now on every enabled network with no per-network wait.
 */
class SocialPostScheduleServiceTest {
    private static final ZoneId ARGENTINA = ZoneId.of("America/Argentina/Buenos_Aires");
    /** Tuesday 2026-11-03 at 10:00 in Argentina, before the Tuesday slot. */
    private static final Instant NOW = Instant.parse("2026-11-03T13:00:00Z");
    /** Monday 2026-11-09 at 12:00 in Argentina. */
    private static final Instant MONDAY_NOON = Instant.parse("2026-11-09T15:00:00Z");
    private static final Map<SocialNetwork, LocalTime> TIKTOK_EVENING = Map.of(SocialNetwork.TIKTOK, LocalTime.of(19, 30));
    private final SocialPostRepository posts = mock(SocialPostRepository.class);
    private final SocialPublicationRepository publications = mock(SocialPublicationRepository.class);
    private final SocialPublishQueue queue = mock(SocialPublishQueue.class);
    private final ContentPillarCatalog pillars = mock(ContentPillarCatalog.class);
    private final WineDayCatalog wineDays = mock(WineDayCatalog.class);

    @BeforeEach
    void catalogs() {
        when(pillars.all()).thenReturn(MarketingFixtures.PILLARS);
        when(wineDays.all()).thenReturn(List.of(MarketingFixtures.MERLOT));
        when(posts.saveScheduleIfUnchanged(any(), any(), any())).thenReturn(true);
        when(posts.saveIfStatus(any(), any())).thenReturn(true);
    }

    @Test
    void reschedulingMovesThePostAndKeepsItsStatus() {
        SocialPost post = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        when(posts.findScheduledBetween(any(), any())).thenReturn(List.of());

        SocialPostAdminResponse response = service(publishing(true)).reschedule(post.id(), MONDAY_NOON, NOW);

        assertThat(response.scheduledFor()).isEqualTo(MONDAY_NOON);
        assertThat(response.status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);
        assertThat(response.canReschedule()).isTrue();
        verify(posts).saveScheduleIfUnchanged(post, SocialPostStatus.PENDING_APPROVAL, TUESDAY_SLOT);
        verify(posts).findScheduledBetween(Instant.parse("2026-11-09T03:00:00Z"), Instant.parse("2026-11-10T02:59:59.999999Z"));
        verify(posts, never()).saveIfStatus(any(), any());
    }

    @Test
    void anotherPostOnTheSameArgentinaDateIsAConflictAndNothingIsSaved() {
        SocialPost post = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        SocialPost lateMonday = MarketingFixtures.draft(Instant.parse("2026-11-10T02:00:00Z"), "EDUCATION", null);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        when(posts.findScheduledBetween(any(), any())).thenReturn(List.of(lateMonday));

        assertThatThrownBy(() -> service(publishing(true)).reschedule(post.id(), MONDAY_NOON, NOW))
                .isInstanceOf(SocialPostDateTakenException.class).hasFieldOrPropertyWithValue("code", "SOCIAL_POST_DATE_TAKEN");

        verify(posts, never()).saveScheduleIfUnchanged(any(), any(), any());
    }

    @Test
    void changingOnlyTheTimeOfTheSameDateIsAllowed() {
        SocialPost post = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        when(posts.findScheduledBetween(any(), any())).thenReturn(List.of(post));
        Instant tuesdayEvening = Instant.parse("2026-11-03T23:00:00Z");

        assertThat(service(publishing(true)).reschedule(post.id(), tuesdayEvening, NOW).scheduledFor()).isEqualTo(tuesdayEvening);
        verify(posts).saveScheduleIfUnchanged(post, SocialPostStatus.PENDING_APPROVAL, TUESDAY_SLOT);
    }

    @Test
    void aRescheduleThatLostTheRaceToPublishingConflicts() {
        SocialPost post = PublishingFixtures.approved(true);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        when(posts.findScheduledBetween(any(), any())).thenReturn(List.of());
        when(posts.saveScheduleIfUnchanged(any(), any(), any())).thenReturn(false);

        assertThatThrownBy(() -> service(publishing(true)).reschedule(post.id(), MONDAY_NOON, NOW))
                .isInstanceOf(InvalidPostTransitionException.class).hasFieldOrPropertyWithValue("code", "INVALID_POST_TRANSITION");
        verify(posts).saveScheduleIfUnchanged(post, SocialPostStatus.APPROVED, TUESDAY_SLOT);
    }

    @Test
    void aRefusedRescheduleSavesNothing() {
        SocialPost scheduled = PublishingFixtures.scheduled();
        SocialPost pending = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        when(posts.findById(scheduled.id())).thenReturn(Optional.of(scheduled));
        when(posts.findById(pending.id())).thenReturn(Optional.of(pending));
        UUID missing = UUID.randomUUID();
        SocialPostScheduleService service = service(publishing(true));

        assertThatThrownBy(() -> service.reschedule(scheduled.id(), MONDAY_NOON, NOW)).isInstanceOf(InvalidPostTransitionException.class);
        assertThatThrownBy(() -> service.reschedule(pending.id(), NOW.minusSeconds(1), NOW))
                .isInstanceOf(SocialPostScheduleNotFutureException.class);
        assertThatThrownBy(() -> service.reschedule(missing, MONDAY_NOON, NOW)).isInstanceOf(EntityNotFoundException.class);
        verify(posts, never()).saveScheduleIfUnchanged(any(), any(), any());
    }

    @Test
    void publishingNowMovesThePostToNowAndQueuesEveryEnabledNetworkWithoutItsWait() {
        SocialPost post = PublishingFixtures.approved(true);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        when(publications.findByPost(post.id())).thenReturn(List.of());

        SocialPostAdminResponse response = service(publishing(true)).publishNow(post.id(), NOW);

        assertThat(response.status()).isEqualTo(SocialPostStatus.SCHEDULED);
        assertThat(response.scheduledFor()).isEqualTo(NOW);
        assertThat(response.publishing().startedAt()).isEqualTo(NOW);
        assertThat(response.canPublishNow()).isFalse();
        verify(posts).saveScheduleIfUnchanged(post, SocialPostStatus.APPROVED, TUESDAY_SLOT);
        verify(posts).saveIfStatus(post, SocialPostStatus.APPROVED);
        ArgumentCaptor<SocialPublication> saved = ArgumentCaptor.forClass(SocialPublication.class);
        verify(publications, times(2)).save(saved.capture());
        assertThat(saved.getAllValues()).extracting(SocialPublication::network).containsExactly(SocialNetwork.INSTAGRAM, SocialNetwork.TIKTOK);
        for (SocialPublication publication : saved.getAllValues()) {
            verify(queue).enqueue(publication.id(), Duration.ZERO);
        }
    }

    @Test
    void onlyAnApprovedPostWithReadyMediaIsPublishedNow() {
        SocialPost pending = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        SocialPost withoutMedia = PublishingFixtures.approved(false);
        when(posts.findById(pending.id())).thenReturn(Optional.of(pending));
        when(posts.findById(withoutMedia.id())).thenReturn(Optional.of(withoutMedia));
        SocialPostScheduleService service = service(publishing(true));

        assertThatThrownBy(() -> service.publishNow(pending.id(), NOW)).isInstanceOf(InvalidPostTransitionException.class)
                .hasFieldOrPropertyWithValue("code", "INVALID_POST_TRANSITION");
        assertThatThrownBy(() -> service.publishNow(withoutMedia.id(), NOW)).isInstanceOf(SocialPostMediaNotReadyException.class)
                .hasFieldOrPropertyWithValue("code", "SOCIAL_POST_MEDIA_NOT_READY");
        verify(posts, never()).saveScheduleIfUnchanged(any(), any(), any());
        verify(posts, never()).saveIfStatus(any(), any());
        verifyNoInteractions(publications, queue);
    }

    @Test
    void publishingNowWhilePublishingOrEveryNetworkIsOffConflicts() {
        SocialPost post = PublishingFixtures.approved(true);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));

        for (PublishingSettings off : List.of(publishing(false),
                new PublishingSettings(true, EnumSet.noneOf(SocialNetwork.class), Duration.ofHours(6), ARGENTINA, TIKTOK_EVENING))) {
            assertThatThrownBy(() -> service(off).publishNow(post.id(), NOW)).isInstanceOf(SocialPublishingOffException.class)
                    .hasFieldOrPropertyWithValue("code", "SOCIAL_PUBLISHING_OFF");
        }
        assertThat(post.scheduledFor()).isEqualTo(TUESDAY_SLOT);
        verify(posts, never()).saveScheduleIfUnchanged(any(), any(), any());
        verifyNoInteractions(publications, queue);
    }

    @Test
    void publishingNowAfterTheSweepStartedThePostConflictsAndQueuesNothing() {
        SocialPost post = PublishingFixtures.approved(true);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        when(posts.saveScheduleIfUnchanged(any(), any(), any())).thenReturn(false);

        assertThatThrownBy(() -> service(publishing(true)).publishNow(post.id(), NOW)).isInstanceOf(InvalidPostTransitionException.class);

        verify(posts, never()).saveIfStatus(any(), any());
        verifyNoInteractions(publications, queue);
    }

    @Test
    void publishingNowThatCouldNotStartConflictsSoItsTransactionRollsBack() {
        SocialPost post = PublishingFixtures.approved(true);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        when(posts.saveIfStatus(any(), any())).thenReturn(false);

        assertThatThrownBy(() -> service(publishing(true)).publishNow(post.id(), NOW)).isInstanceOf(InvalidPostTransitionException.class);

        verifyNoInteractions(publications, queue);
    }

    private static PublishingSettings publishing(boolean enabled) {
        return new PublishingSettings(enabled, EnumSet.of(SocialNetwork.INSTAGRAM, SocialNetwork.TIKTOK), Duration.ofHours(6), ARGENTINA,
                TIKTOK_EVENING);
    }

    private SocialPostScheduleService service(PublishingSettings settings) {
        SocialPostPresenter presenter = new SocialPostPresenter(pillars, wineDays, WeeklyPlanner.Settings.defaults(), ids -> Map.of(),
                publications, mock(SocialMetricsRepository.class), settings);
        SocialPublishingStarter starter = new SocialPublishingStarter(posts, publications, queue, mock(SocialPublishingNotices.class), settings);
        return new SocialPostScheduleService(posts, starter, settings, WeeklyPlanner.Settings.defaults(), presenter);
    }
}
