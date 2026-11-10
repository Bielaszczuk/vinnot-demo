package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.PublishingSettings;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPost;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import static com.vinnot.marketing.application.service.MarketingFixtures.TUESDAY_SLOT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** #510 S2/S9: every sweep starts the due approved posts, one by one, and does nothing while no network is enabled. */
class SocialPublishingSweepServiceTest {
    private static final Instant NOW = TUESDAY_SLOT.plusSeconds(60);
    /** Two media graces of six hours before now: the oldest slot still due. */
    private static final Instant WINDOW_START = NOW.minus(Duration.ofHours(12));
    private final SocialPostRepository posts = mock(SocialPostRepository.class);
    private final SocialPublishingStarter starter = mock(SocialPublishingStarter.class);

    @Test
    void startsEveryDuePostAndCountsTheOnesThatStarted() {
        SocialPost ready = PublishingFixtures.approved(true);
        SocialPost waiting = PublishingFixtures.approved(false);
        SocialPost broken = PublishingFixtures.approved(true);
        SocialPost failed = PublishingFixtures.approved(false);
        when(posts.findDueForPublishing(WINDOW_START, NOW, SocialPublishingSweepService.BATCH)).thenReturn(List.of(ready, broken, waiting, failed));
        when(starter.start(ready, NOW)).thenReturn(SocialPublishingStarter.Result.STARTED);
        when(starter.start(broken, NOW)).thenThrow(new IllegalStateException("database down"));
        when(starter.start(waiting, NOW)).thenReturn(SocialPublishingStarter.Result.WAITING_FOR_MEDIA);
        when(starter.start(failed, NOW)).thenReturn(SocialPublishingStarter.Result.MEDIA_NOT_READY);

        int started = service(EnumSet.of(SocialNetwork.INSTAGRAM)).startDue(NOW);

        assertThat(started).isEqualTo(1);
        verify(starter).start(failed, NOW);
        verify(starter).start(waiting, NOW);
    }

    @Test
    void withoutAnEnabledNetworkTheSweepDoesNothing() {
        assertThat(service(Set.of()).startDue(NOW)).isZero();

        verifyNoInteractions(posts, starter);
    }

    @Test
    void withPublishingSwitchedOffTheSweepLeavesEveryApprovedPostApprovedEvenWithNetworksOn() {
        SocialPublishingSweepService off = new SocialPublishingSweepService(posts, starter,
                new PublishingSettings(false, EnumSet.allOf(SocialNetwork.class), Duration.ofHours(6)));

        assertThat(off.startDue(NOW)).isZero();

        verifyNoInteractions(posts, starter);
    }

    @Test
    void nothingDueStartsNothing() {
        when(posts.findDueForPublishing(any(), any(), anyInt())).thenReturn(List.of());

        assertThat(service(EnumSet.allOf(SocialNetwork.class)).startDue(NOW)).isZero();

        verifyNoInteractions(starter);
    }

    @Test
    void onlySlotsWithinTwoMediaGracesAreDueSoTheOldApprovedBacklogIsNeverPublished() {
        SocialPost fiveHoursLate = PublishingFixtures.approved(true, NOW.minus(Duration.ofHours(5)), PublishingFixtures.IG_1,
                PublishingFixtures.IG_2, PublishingFixtures.TT_1);
        when(posts.findDueForPublishing(any(), any(), anyInt())).thenReturn(List.of(fiveHoursLate));
        when(starter.start(fiveHoursLate, NOW)).thenReturn(SocialPublishingStarter.Result.STARTED);

        assertThat(service(EnumSet.of(SocialNetwork.INSTAGRAM)).startDue(NOW)).isEqualTo(1);

        verify(posts).findDueForPublishing(WINDOW_START, NOW, SocialPublishingSweepService.BATCH);
        verify(starter).start(fiveHoursLate, NOW);
    }

    private SocialPublishingSweepService service(Set<SocialNetwork> networks) {
        return new SocialPublishingSweepService(posts, starter, new PublishingSettings(true, networks, Duration.ofHours(6)));
    }
}
