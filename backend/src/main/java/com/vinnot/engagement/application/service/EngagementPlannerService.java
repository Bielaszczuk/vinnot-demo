package com.vinnot.engagement.application.service;

import com.vinnot.engagement.application.model.PlanPage;
import com.vinnot.engagement.application.model.PlanReport;
import com.vinnot.engagement.application.model.PlanningAccount;
import com.vinnot.engagement.application.port.in.PlanEngagementPageUseCase;
import com.vinnot.engagement.application.port.in.PlanEngagementUseCase;
import com.vinnot.engagement.application.port.out.EngagementAudiencePort;
import com.vinnot.engagement.application.port.out.PlannerLeasePort;
import com.vinnot.notification.application.port.in.PushPlanningUseCase;
import com.vinnot.notification.domain.model.NotificationType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.DateTimeException;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.Semaphore;

/**
 * The engagement planner (#405, S16). A run takes the cluster-wide lease, then walks the time zones whose local time is
 * in the planning window (from {@code planning-hour}, for {@code catch-up-hours}, so a missed run is caught up), and
 * each zone's not-yet-planned accounts in keyset pages. Pages are planned on virtual threads, at most
 * {@code concurrency} at a time, which also bounds the database connections a run uses; the next page is read while
 * earlier ones are being planned. A page that fails is logged and counted; the others go on, and its accounts are
 * planned by the next run.
 */
@Service
public class EngagementPlannerService implements PlanEngagementUseCase {
    private static final Logger LOGGER = LoggerFactory.getLogger(EngagementPlannerService.class);
    private final PlannerLeasePort lease;
    private final EngagementAudiencePort audience;
    private final PlanEngagementPageUseCase pages;
    private final PushPlanningUseCase planning;
    private final Settings settings;
    private final Clock clock;
    private static final int LAST_HOUR = 23;
    private static final int HOURS_PER_DAY = 24;
    private final String holder = "planner-" + UUID.randomUUID();

    /**
     * @param planningHour the local hour planning starts each day (0-23)
     * @param catchUpHours how many hours after it an account can still be planned that day
     * @param pageSize     accounts per keyset page
     * @param concurrency  pages planned at once
     * @param lease        how long a run may hold the lease
     */
    public record Settings(int planningHour, int catchUpHours, int pageSize, int concurrency, Duration lease) {
        public Settings {
            if (planningHour < 0 || planningHour > LAST_HOUR || catchUpHours < 1 || planningHour + catchUpHours > HOURS_PER_DAY
                    || pageSize < 1 || pageSize > 1000 || concurrency < 1 || !lease.isPositive()) {
                throw new IllegalArgumentException("Invalid app.engagement planner settings");
            }
        }
    }

    @Autowired
    public EngagementPlannerService(PlannerLeasePort lease, EngagementAudiencePort audience, PlanEngagementPageUseCase pages,
            PushPlanningUseCase planning,
            @Value("${app.engagement.planning-hour:4}") int planningHour,
            @Value("${app.engagement.catch-up-hours:6}") int catchUpHours,
            @Value("${app.engagement.page-size:1000}") int pageSize,
            @Value("${app.engagement.concurrency:4}") int concurrency,
            @Value("${app.engagement.lease:2h}") Duration leaseDuration) {
        this(lease, audience, pages, planning, new Settings(planningHour, catchUpHours, pageSize, concurrency, leaseDuration),
                Clock.systemUTC());
    }

    EngagementPlannerService(PlannerLeasePort lease, EngagementAudiencePort audience, PlanEngagementPageUseCase pages,
            PushPlanningUseCase planning, Settings settings, Clock clock) {
        this.lease = lease;
        this.audience = audience;
        this.pages = pages;
        this.planning = planning;
        this.settings = settings;
        this.clock = clock;
    }

    @Override
    public PlanReport plan(Instant now) {
        if (!lease.acquire(holder, now, settings.lease())) {
            LOGGER.info("Engagement planning skipped: another instance holds the planner lease");
            return PlanReport.skippedRun();
        }
        try {
            return planZones(now);
        } finally {
            lease.release(holder, clock.instant());
        }
    }

    private PlanReport planZones(Instant now) {
        Set<NotificationType> switchedOff = planning.switchedOff();
        Semaphore slots = new Semaphore(settings.concurrency());
        List<Future<PlanReport>> running = new ArrayList<>();
        try (ExecutorService workers = Executors.newThreadPerTaskExecutor(
                Thread.ofVirtual().name("engagement-page-", 0).factory())) {
            for (ZoneId zone : zonesToPlan(now)) {
                Instant plannedBefore = now.atZone(zone).toLocalDate().atStartOfDay(zone).toInstant();
                UUID after = null;
                List<PlanningAccount> accounts;
                do {
                    accounts = audience.page(zone.getId(), plannedBefore, after, settings.pageSize());
                    if (!accounts.isEmpty()) {
                        PlanPage page = new PlanPage(zone, accounts, now, plannedBefore, switchedOff);
                        slots.acquireUninterruptibly();
                        running.add(workers.submit(() -> planReleasing(page, slots)));
                        after = accounts.getLast().userId();
                    }
                } while (accounts.size() == settings.pageSize());
            }
        }
        PlanReport total = PlanReport.empty();
        for (Future<PlanReport> page : running) {
            total = total.plus(outcome(page));
        }
        return total;
    }

    private PlanReport planReleasing(PlanPage page, Semaphore slots) {
        try {
            return pages.plan(page);
        } finally {
            slots.release();
        }
    }

    /** A page that failed, or whose wait was interrupted, counts as one failed page. */
    static PlanReport outcome(Future<PlanReport> page) {
        try {
            return page.get();
        } catch (ExecutionException failure) {
            LOGGER.warn("An engagement planning page failed; its accounts are planned by the next run", failure.getCause());
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
        }
        return new PlanReport(false, 1, 1, Map.of(), 0);
    }

    /** Zones accounts use whose local hour is inside today's planning window; unknown zone names are skipped. */
    List<ZoneId> zonesToPlan(Instant now) {
        return audience.timeZones().stream().map(EngagementPlannerService::zone).flatMap(Optional::stream)
                .filter(zone -> {
                    int hour = now.atZone(zone).getHour();
                    return hour >= settings.planningHour() && hour < settings.planningHour() + settings.catchUpHours();
                })
                .toList();
    }

    private static Optional<ZoneId> zone(String id) {
        try {
            return Optional.of(ZoneId.of(id));
        } catch (DateTimeException unknown) {
            return Optional.empty();
        }
    }
}
