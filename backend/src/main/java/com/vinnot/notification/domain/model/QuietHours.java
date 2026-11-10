package com.vinnot.notification.domain.model;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;

/**
 * Non-urgent pushes wait between 22:00 and 08:00 in the account's time zone; engagement pushes (#405, S11), the
 * event-triggered wine suggestion included, until 09:00.
 */
public final class QuietHours {
    static final LocalTime START = LocalTime.of(22, 0);
    static final LocalTime END = LocalTime.of(8, 0);
    static final LocalTime ENGAGEMENT_END = LocalTime.of(9, 0);

    private QuietHours() {
    }

    /** When the quiet period that contains {@code now} ends, or empty when it is not quiet there. */
    public static Optional<Instant> endOf(Instant now, ZoneId zone) {
        return endOf(now, zone, END);
    }

    /** The same for an engagement push, whose quiet period lasts until 09:00. */
    public static Optional<Instant> engagementEndOf(Instant now, ZoneId zone) {
        return endOf(now, zone, ENGAGEMENT_END);
    }

    private static Optional<Instant> endOf(Instant now, ZoneId zone, LocalTime end) {
        ZonedDateTime local = now.atZone(zone);
        LocalTime time = local.toLocalTime();
        if (!time.isBefore(START)) {
            return Optional.of(local.toLocalDate().plusDays(1).atTime(end).atZone(zone).toInstant());
        }
        if (time.isBefore(end)) {
            return Optional.of(local.toLocalDate().atTime(end).atZone(zone).toInstant());
        }
        return Optional.empty();
    }
}
