package com.vinnot.engagement.application.service;

import com.vinnot.engagement.application.model.PlanPage;
import com.vinnot.engagement.application.model.PlanReport;
import com.vinnot.engagement.application.model.PlanningAccount;
import com.vinnot.engagement.application.port.in.PlanEngagementPageUseCase;
import com.vinnot.engagement.application.port.out.EngagementAudiencePort;
import com.vinnot.engagement.application.port.out.PlannerLeasePort;
import com.vinnot.engagement.domain.model.EngagementDecision;
import com.vinnot.notification.application.port.in.PushPlanningUseCase;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** S16: one run at a time, zones at their local planning hour, keyset pages planned on virtual threads. */
class EngagementPlannerServiceTest {
    /** 04:30 in Buenos Aires, 09:30 in Madrid (still in the window), 16:30 in Tokyo. */
    private static final Instant NOW = Instant.parse("2026-10-21T07:30:00Z");
    private final PlannerLeasePort lease = mock(PlannerLeasePort.class);
    private final EngagementAudiencePort audience = mock(EngagementAudiencePort.class);
    private final PlanEngagementPageUseCase pages = mock(PlanEngagementPageUseCase.class);
    private final PushPlanningUseCase planning = mock(PushPlanningUseCase.class);

    @Test
    void aRunThatFindsTheLeaseTakenDoesNothing() {
        when(lease.acquire(anyString(), eq(NOW), eq(Duration.ofHours(2)))).thenReturn(false);

        assertThat(service(2, 1).plan(NOW)).isEqualTo(PlanReport.skippedRun());

        verifyNoInteractions(audience, pages, planning);
        verify(lease, never()).release(anyString(), any());
    }

    @Test
    void walksTheZonesInTheirPlanningWindowInKeysetPagesAndReleasesTheLease() {
        when(lease.acquire(anyString(), eq(NOW), eq(Duration.ofHours(2)))).thenReturn(true);
        when(planning.switchedOff()).thenReturn(Set.of(NotificationType.WINBACK));
        when(audience.timeZones()).thenReturn(List.of("America/Argentina/Buenos_Aires", "Asia/Tokyo", "Europe/Madrid", "Not/AZone"));
        List<PlanningAccount> first = accounts(2);
        List<PlanningAccount> second = accounts(1);
        Instant baMidnight = Instant.parse("2026-10-21T03:00:00Z");
        when(audience.page("America/Argentina/Buenos_Aires", baMidnight, null, 2)).thenReturn(first);
        when(audience.page("America/Argentina/Buenos_Aires", baMidnight, first.get(1).userId(), 2)).thenReturn(second);
        when(audience.page(eq("Europe/Madrid"), any(), isNull(), eq(2))).thenReturn(List.of());
        when(pages.plan(any())).thenReturn(new PlanReport(false, 1, 0, Map.of(EngagementDecision.Outcome.PLANNED, 1), 0));

        PlanReport report = service(2, 1).plan(NOW);

        assertThat(report.pages()).isEqualTo(2);
        assertThat(report.count(EngagementDecision.Outcome.PLANNED)).isEqualTo(2);
        verify(pages).plan(new PlanPage(ZoneId.of("America/Argentina/Buenos_Aires"), first, NOW, baMidnight,
                Set.of(NotificationType.WINBACK)));
        verify(pages).plan(new PlanPage(ZoneId.of("America/Argentina/Buenos_Aires"), second, NOW, baMidnight,
                Set.of(NotificationType.WINBACK)));
        verify(audience, never()).page(eq("Asia/Tokyo"), any(), any(), anyInt());
        verify(lease).release(anyString(), eq(NOW.plusSeconds(1)));
    }

    @Test
    void aFailedPageIsCountedAndTheOthersGoOn() {
        when(lease.acquire(anyString(), any(), any())).thenReturn(true);
        when(audience.timeZones()).thenReturn(List.of("America/Argentina/Buenos_Aires"));
        List<PlanningAccount> first = accounts(1);
        when(audience.page(anyString(), any(), isNull(), eq(1))).thenReturn(first);
        when(audience.page(anyString(), any(), eq(first.getFirst().userId()), eq(1))).thenReturn(accounts(1));
        when(pages.plan(any())).thenThrow(new IllegalStateException("database down"))
                .thenReturn(new PlanReport(false, 1, 0, Map.of(), 0));
        when(audience.page(anyString(), any(), any(UUID.class), eq(1))).thenReturn(List.of());

        PlanReport report = service(1, 2).plan(NOW);

        assertThat(report.pages()).isEqualTo(1);
        assertThat(report.failedPages()).isEqualTo(1);
    }

    @Test
    void neverPlansMorePagesAtOnceThanTheConcurrency() throws Exception {
        when(lease.acquire(anyString(), any(), any())).thenReturn(true);
        when(audience.timeZones()).thenReturn(List.of("America/Argentina/Buenos_Aires"));
        List<List<PlanningAccount>> walk = IntStream.range(0, 6).mapToObj(index -> accounts(1)).toList();
        when(audience.page(anyString(), any(), isNull(), eq(1))).thenReturn(walk.get(0));
        for (int index = 0; index < 5; index++) {
            when(audience.page(anyString(), any(), eq(walk.get(index).getFirst().userId()), eq(1))).thenReturn(walk.get(index + 1));
        }
        when(audience.page(anyString(), any(), eq(walk.get(5).getFirst().userId()), eq(1))).thenReturn(List.of());
        AtomicInteger running = new AtomicInteger();
        AtomicInteger most = new AtomicInteger();
        CountDownLatch overlap = new CountDownLatch(2);
        when(pages.plan(any())).thenAnswer(call -> {
            most.accumulateAndGet(running.incrementAndGet(), Math::max);
            overlap.countDown();
            overlap.await(200, TimeUnit.MILLISECONDS);
            running.decrementAndGet();
            return new PlanReport(false, 1, 0, Map.of(), 0);
        });

        PlanReport report = service(1, 2).plan(NOW);

        assertThat(report.pages()).isEqualTo(6);
        assertThat(most.get()).isEqualTo(2);
    }

    @Test
    void anInterruptedWaitCountsTheOutstandingPageAsFailedAndKeepsTheInterrupt() throws Exception {
        @SuppressWarnings("unchecked")
        Future<PlanReport> page = mock(Future.class);
        when(page.get()).thenThrow(new InterruptedException("stopping"));

        PlanReport report = EngagementPlannerService.outcome(page);

        assertThat(Thread.interrupted()).as("the interrupt is restored (and cleared here)").isTrue();
        assertThat(report).isEqualTo(new PlanReport(false, 1, 1, Map.of(), 0));
    }

    @Test
    void settingsAreValidated() {
        assertThatThrownBy(() -> new EngagementPlannerService.Settings(24, 1, 10, 1, Duration.ofHours(1)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EngagementPlannerService.Settings(-1, 1, 10, 1, Duration.ofHours(1)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EngagementPlannerService.Settings(20, 6, 10, 1, Duration.ofHours(1)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EngagementPlannerService.Settings(4, 0, 10, 1, Duration.ofHours(1)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EngagementPlannerService.Settings(4, 6, 1001, 1, Duration.ofHours(1)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EngagementPlannerService.Settings(4, 6, 0, 1, Duration.ofHours(1)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EngagementPlannerService.Settings(4, 6, 10, 0, Duration.ofHours(1)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EngagementPlannerService.Settings(4, 6, 10, 1, Duration.ZERO))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(new EngagementPlannerService(lease, audience, pages, planning, 4, 6, 1000, 4, Duration.ofHours(2))).isNotNull();
    }

    private EngagementPlannerService service(int pageSize, int concurrency) {
        return new EngagementPlannerService(lease, audience, pages, planning,
                new EngagementPlannerService.Settings(4, 6, pageSize, concurrency, Duration.ofHours(2)),
                Clock.fixed(NOW.plusSeconds(1), ZoneOffset.UTC));
    }

    private static List<PlanningAccount> accounts(int count) {
        return IntStream.range(0, count).mapToObj(index -> new PlanningAccount(UUID.randomUUID(), NOW, NOW)).toList();
    }
}
