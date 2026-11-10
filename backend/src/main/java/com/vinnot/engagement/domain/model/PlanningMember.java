package com.vinnot.engagement.domain.model;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Objects;
import java.util.OptionalInt;
import java.util.UUID;

/**
 * An account being planned: its time zone, when it was created, when it was last seen (app open, device registration
 * or creation, whichever is latest) and its usual app-open hour, if any.
 */
public record PlanningMember(UUID userId, ZoneId zone, Instant createdAt, Instant lastSeenAt, OptionalInt usualHour) {
    public PlanningMember {
        Objects.requireNonNull(userId, "userId");
        Objects.requireNonNull(zone, "zone");
        Objects.requireNonNull(createdAt, "createdAt");
        lastSeenAt = Objects.requireNonNullElse(lastSeenAt, createdAt);
        usualHour = Objects.requireNonNullElse(usualHour, OptionalInt.empty());
    }

    /** Whether the account was away for at least {@code away} at {@code now}. */
    public boolean awayFor(Duration away, Instant now) {
        return !lastSeenAt.isAfter(now.minus(away));
    }
}
