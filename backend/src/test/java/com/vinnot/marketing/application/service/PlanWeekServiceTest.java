package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.PlanResult;
import com.vinnot.marketing.application.model.PlannedBatch;
import com.vinnot.marketing.application.port.out.ContentPillarCatalog;
import com.vinnot.marketing.application.port.out.SocialCopyQueue;
import com.vinnot.marketing.application.port.out.SocialMetricsRepository;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.application.port.out.WineDayCatalog;
import com.vinnot.marketing.domain.model.PillarPerformance;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.marketing.domain.service.WeeklyPlanner;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import static com.vinnot.marketing.application.service.MarketingFixtures.MERLOT;
import static com.vinnot.marketing.application.service.MarketingFixtures.NOW;
import static com.vinnot.marketing.application.service.MarketingFixtures.PILLARS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * S3 and S6: the planner stores drafts and queues their copy, so "Plan now" answers before the AI writes; the queued
 * job writes the copy and tells the admins ({@link PlannedCopyServiceTest}). #510 S7: the pillars' last 90 days of metrics
 * weigh the rotation. #513 S1-S3: rotating posts at 12:30 on Tuesday, Wednesday and Thursday, the Merlot day at 09:30 on its
 * own Saturday, a wine-day post moved to another date is not planned again, and a slot already past today is skipped.
 */
class PlanWeekServiceTest {
    private static final Instant MERLOT_MORNING = Instant.parse("2026-11-07T12:30:00Z");
    private final SocialPostRepository posts = mock(SocialPostRepository.class);
    private final WineDayCatalog wineDays = mock(WineDayCatalog.class);
    private final ContentPillarCatalog pillars = mock(ContentPillarCatalog.class);
    private final SocialCopyQueue queue = mock(SocialCopyQueue.class);
    private final WeeklyPlanner.Settings settings = WeeklyPlanner.Settings.defaults();
    private final SocialMetricsRepository metrics = mock(SocialMetricsRepository.class);
    private final PlanWeekService service = new PlanWeekService(new WeeklyPlanner(settings), settings, posts, wineDays, pillars, queue,
            new PillarPerformanceService(metrics, 90, Clock.fixed(NOW, ZoneOffset.UTC)));

    @Test
    void storesOneDraftPerSlotAndQueuesTheirCopyInsteadOfWritingIt() {
        when(wineDays.all()).thenReturn(List.of(MERLOT));
        when(pillars.all()).thenReturn(PILLARS);
        when(posts.findScheduledBetween(any(), any())).thenReturn(List.of());

        PlanResult result = service.execute(NOW);

        assertThat(result).isEqualTo(new PlanResult(7, LocalDate.of(2026, 11, 2), LocalDate.of(2026, 11, 15)));
        ArgumentCaptor<SocialPost> saved = ArgumentCaptor.forClass(SocialPost.class);
        verify(posts, times(7)).save(saved.capture());
        assertThat(saved.getAllValues()).allSatisfy(post -> assertThat(post.status()).isEqualTo(SocialPostStatus.DRAFT));
        assertThat(saved.getAllValues()).extracting(SocialPost::scheduledFor).contains(Instant.parse("2026-11-03T15:30:00Z"), MERLOT_MORNING);
        assertThat(saved.getAllValues()).filteredOn(post -> "MERLOT".equals(post.wineDayCode())).extracting(SocialPost::scheduledFor)
                .containsExactly(MERLOT_MORNING);
        verify(queue).enqueue(new PlannedBatch(saved.getAllValues().stream().map(SocialPost::id).toList(),
                LocalDate.of(2026, 11, 2), LocalDate.of(2026, 11, 15)));
        verify(posts).findScheduledBetween(Instant.parse("2026-10-19T03:00:00Z"), Instant.parse("2026-11-16T02:59:59Z"));
    }

    @Test
    void aSecondRunOverTheSameWindowCreatesNothingAndQueuesNothing() {
        when(wineDays.all()).thenReturn(List.of(MERLOT));
        when(pillars.all()).thenReturn(PILLARS);
        List<SocialPost> existing = List.of(MarketingFixtures.draft(Instant.parse("2026-11-03T15:30:00Z"), "CURIOUS_FACT", null),
                MarketingFixtures.draft(Instant.parse("2026-11-04T15:30:00Z"), "EDUCATION", null),
                MarketingFixtures.draft(Instant.parse("2026-11-05T15:30:00Z"), "CURIOUS_FACT", null),
                MarketingFixtures.pending(MERLOT_MORNING, "WINE_DAY", "MERLOT"),
                MarketingFixtures.draft(Instant.parse("2026-11-10T15:30:00Z"), "APP_FEATURE", null),
                MarketingFixtures.draft(Instant.parse("2026-11-11T15:30:00Z"), "CURIOUS_FACT", null),
                MarketingFixtures.draft(Instant.parse("2026-11-12T15:30:00Z"), "EDUCATION", null));
        when(posts.findScheduledBetween(any(), any())).thenReturn(existing);

        assertThat(service.execute(NOW).created()).isZero();
        verify(posts, never()).save(any());
        verify(queue, never()).enqueue(any());
    }

    @Test
    void aWineDayPostTheAdminMovedToAnotherDateIsNotPlannedAgain() {
        when(wineDays.all()).thenReturn(List.of(MERLOT));
        when(pillars.all()).thenReturn(PILLARS);
        when(posts.findScheduledBetween(any(), any())).thenReturn(List.of(
                MarketingFixtures.pending(Instant.parse("2026-11-06T20:00:00Z"), "WINE_DAY", "MERLOT")));

        service.execute(NOW);

        ArgumentCaptor<SocialPost> saved = ArgumentCaptor.forClass(SocialPost.class);
        verify(posts, times(6)).save(saved.capture());
        assertThat(saved.getAllValues()).extracting(SocialPost::wineDayCode).containsOnlyNulls();
    }

    @Test
    void planningAfterTodaysSlotSkipsThatSlotInsteadOfCreatingAPostInThePast() {
        Instant afterTuesdaySlot = Instant.parse("2026-11-03T16:00:00Z");
        when(wineDays.all()).thenReturn(List.of(MERLOT));
        when(pillars.all()).thenReturn(PILLARS);
        when(posts.findScheduledBetween(any(), any())).thenReturn(List.of());

        PlanResult result = service.execute(afterTuesdaySlot);

        ArgumentCaptor<SocialPost> saved = ArgumentCaptor.forClass(SocialPost.class);
        verify(posts, times(result.created())).save(saved.capture());
        assertThat(saved.getAllValues()).isNotEmpty().extracting(SocialPost::scheduledFor)
                .allSatisfy(at -> assertThat(at).isAfter(afterTuesdaySlot)).doesNotContain(Instant.parse("2026-11-03T15:30:00Z"));
        verify(queue).enqueue(new PlannedBatch(saved.getAllValues().stream().map(SocialPost::id).toList(),
                LocalDate.of(2026, 11, 3), LocalDate.of(2026, 11, 16)));
    }

    @Test
    void theLastNinetyDaysOfMetricsWeighTheRotation() {
        when(wineDays.all()).thenReturn(List.of(MERLOT));
        when(pillars.all()).thenReturn(PILLARS);
        when(posts.findScheduledBetween(any(), any())).thenReturn(List.of());
        assertThat(pillarsOfPlan()).as("neutral without metrics").containsExactly("CURIOUS_FACT", "EDUCATION", "CURIOUS_FACT",
                "WINE_DAY", "APP_FEATURE", "EDUCATION", "CURIOUS_FACT");

        when(metrics.pillarPerformance(Instant.parse("2026-08-04T12:00:00Z"))).thenReturn(List.of(
                new PillarPerformance("CURIOUS_FACT", 3, 1000, 1000), new PillarPerformance("EDUCATION", 3, 1000, 10)));

        assertThat(pillarsOfPlan()).as("CURIOUS_FACT engages far more per view").containsExactly("CURIOUS_FACT", "EDUCATION",
                "CURIOUS_FACT", "WINE_DAY", "APP_FEATURE", "CURIOUS_FACT", "EDUCATION");
    }

    private List<String> pillarsOfPlan() {
        clearInvocations(posts);
        service.execute(NOW);
        ArgumentCaptor<SocialPost> saved = ArgumentCaptor.forClass(SocialPost.class);
        verify(posts, times(7)).save(saved.capture());
        return saved.getAllValues().stream().map(SocialPost::pillarCode).toList();
    }
}
