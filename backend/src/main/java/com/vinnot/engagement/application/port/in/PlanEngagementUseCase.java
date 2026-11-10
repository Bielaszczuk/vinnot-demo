package com.vinnot.engagement.application.port.in;

import com.vinnot.engagement.application.model.PlanReport;

import java.time.Instant;

/**
 * Plans the day's engagement pushes (#405, S16) for every account whose local time is in the planning window and
 * that was not planned yet today. One run at a time across instances; a run that finds the lease taken does nothing.
 */
public interface PlanEngagementUseCase {
    PlanReport plan(Instant now);
}
