package com.vinnot.engagement.application.port.out;

import com.vinnot.engagement.application.model.PlanningAccount;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

/** The accounts the planner walks: active, not suspended, with a push device, one time zone at a time. */
public interface EngagementAudiencePort {
    /** The time zones accounts use. */
    List<String> timeZones();

    /** Up to {@code limit} accounts of a time zone after {@code after} (null: from the start) in id order, not planned since {@code plannedBefore}. */
    List<PlanningAccount> page(String timeZone, Instant plannedBefore, UUID after, int limit);

    /**
     * Marks the accounts planned at {@code at} unless another run planned them since {@code plannedBefore}, in the
     * caller's transaction; concurrent claims of one account wait for each other.
     *
     * @return the accounts this call claimed
     */
    List<UUID> claim(Collection<UUID> userIds, Instant plannedBefore, Instant at);
}
