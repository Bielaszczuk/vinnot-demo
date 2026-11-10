package com.vinnot.engagement.application.model;

import com.vinnot.notification.domain.model.NotificationType;

import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;

/**
 * One keyset page of accounts of one time zone to plan.
 *
 * @param plannedBefore accounts planned at or after this instant (the start of their local day) are skipped
 */
public record PlanPage(ZoneId zone, List<PlanningAccount> accounts, Instant now, Instant plannedBefore,
        Set<NotificationType> switchedOff) {
    public PlanPage {
        accounts = List.copyOf(accounts);
        switchedOff = Set.copyOf(switchedOff);
    }
}
