package com.vinnot.engagement.application.model;

import java.time.Instant;
import java.util.UUID;

/**
 * An account the planner may plan: active, not suspended and with at least one push device.
 *
 * @param deviceSeenAt when the app last registered one of its devices
 */
public record PlanningAccount(UUID userId, Instant createdAt, Instant deviceSeenAt) {
}
