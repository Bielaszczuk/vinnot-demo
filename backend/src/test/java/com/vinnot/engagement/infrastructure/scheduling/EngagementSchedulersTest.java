package com.vinnot.engagement.infrastructure.scheduling;

import com.vinnot.engagement.application.model.PlanReport;
import com.vinnot.engagement.application.port.in.AutoPauseEngagementUseCase;
import com.vinnot.engagement.application.port.in.PlanEngagementUseCase;
import com.vinnot.engagement.application.port.in.PurgeEngagementLedgerUseCase;
import com.vinnot.engagement.domain.model.EngagementDecision;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** S16, S17: the hourly planner run and the maintenance jobs call their use cases with the current time. */
class EngagementSchedulersTest {
    @Test
    void thePlannerRunsWhetherItPlannedSomethingWasSkippedOrFoundNothing() {
        PlanEngagementUseCase planner = mock(PlanEngagementUseCase.class);
        when(planner.plan(any(Instant.class))).thenReturn(
                new PlanReport(false, 2, 1, Map.of(EngagementDecision.Outcome.PLANNED, 5), 1),
                PlanReport.skippedRun(), PlanReport.empty());
        EngagementPlannerScheduler scheduler = new EngagementPlannerScheduler(planner);

        scheduler.plan();
        scheduler.plan();
        scheduler.plan();

        verify(planner, times(3)).plan(any(Instant.class));
    }

    @Test
    void maintenancePausesNoisyTypesAndPurgesTheLedger() {
        AutoPauseEngagementUseCase autoPause = mock(AutoPauseEngagementUseCase.class);
        PurgeEngagementLedgerUseCase retention = mock(PurgeEngagementLedgerUseCase.class);
        when(autoPause.pauseNoisyTypes(any())).thenReturn(List.of());
        when(retention.purge(any())).thenReturn(3, 0);
        EngagementMaintenanceScheduler scheduler = new EngagementMaintenanceScheduler(autoPause, retention);

        scheduler.pauseNoisyTypes();
        scheduler.purgeLedger();
        scheduler.purgeLedger();

        verify(autoPause).pauseNoisyTypes(any(Instant.class));
        verify(retention, times(2)).purge(any(Instant.class));
    }
}
