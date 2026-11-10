package com.vinnot.engagement.application.port.in;

import com.vinnot.engagement.application.model.PlanPage;
import com.vinnot.engagement.application.model.PlanReport;

/**
 * Plans one keyset page of accounts in one transaction, with a fixed number of queries however many accounts it holds:
 * it claims them (so a concurrent run skips them), reads their signals and candidates in bulk, and queues the chosen
 * pushes.
 */
public interface PlanEngagementPageUseCase {
    PlanReport plan(PlanPage page);
}
