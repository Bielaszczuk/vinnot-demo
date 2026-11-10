package com.vinnot.engagement.infrastructure.scheduling;

import com.vinnot.engagement.application.model.PlanReport;
import com.vinnot.engagement.application.port.in.PlanEngagementUseCase;
import com.vinnot.engagement.domain.model.EngagementDecision;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Runs the engagement planner every hour (#405): each run plans the time zones whose local morning it is, so every
 * account is planned once a day at its own local planning hour. Safe on every instance: one run holds the lease.
 */
@Component
@ConditionalOnProperty(name = "app.engagement.enabled", havingValue = "true", matchIfMissing = true)
public class EngagementPlannerScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(EngagementPlannerScheduler.class);
    private final PlanEngagementUseCase planner;

    public EngagementPlannerScheduler(PlanEngagementUseCase planner) {
        this.planner = planner;
    }

    @Scheduled(initialDelayString = "${app.engagement.initial-delay-ms:600000}",
            fixedDelayString = "${app.engagement.delay-ms:3600000}")
    public void plan() {
        PlanReport report = planner.plan(Instant.now());
        if (!report.skipped() && report.pages() > 0) {
            LOGGER.info("Engagement planning: {} page(s), {} failed, {} push(es) planned, {} held out, outcomes {}",
                    report.pages(), report.failedPages(), report.count(EngagementDecision.Outcome.PLANNED), report.heldOut(),
                    report.outcomes());
        }
    }
}
