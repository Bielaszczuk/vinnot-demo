package com.vinnot.engagement.domain.model;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.OptionalInt;

/**
 * When an engagement push goes out (#405, S11): at the account's usual app-open hour in its own time zone, or 19:30 on
 * weekdays and 12:30 on weekends when it has none, and never between 22:00 and 09:00 there.
 */
public final class SendTime {
    public static final LocalTime EARLIEST = LocalTime.of(9, 0);
    /** The latest time a push may go out; 22:00 is already quiet. */
    public static final LocalTime LATEST = LocalTime.of(21, 59);
    public static final LocalTime WEEKDAY_FALLBACK = LocalTime.of(19, 30);
    public static final LocalTime WEEKEND_FALLBACK = LocalTime.of(12, 30);
    /** A usual hour of 22:00 or later is moved to this hour. */
    static final LocalTime LATE_CLAMP = LocalTime.of(21, 0);

    private SendTime() {
    }

    /** The send time on a local day, clamped into the allowed window. */
    public static ZonedDateTime on(LocalDate day, ZoneId zone, OptionalInt usualHour) {
        LocalTime time;
        if (usualHour.isPresent()) {
            time = clamp(LocalTime.of(usualHour.getAsInt(), 0));
        } else {
            DayOfWeek weekday = day.getDayOfWeek();
            time = weekday == DayOfWeek.SATURDAY || weekday == DayOfWeek.SUNDAY ? WEEKEND_FALLBACK : WEEKDAY_FALLBACK;
        }
        return day.atTime(time).atZone(zone);
    }

    /**
     * The planned send time for {@code now}'s local day, or {@code now} itself when that time already passed (a late
     * run); empty when it is too late in the day to send.
     */
    public static Optional<Instant> next(Instant now, ZoneId zone, OptionalInt usualHour) {
        ZonedDateTime local = now.atZone(zone);
        Instant planned = on(local.toLocalDate(), zone, usualHour).toInstant();
        if (planned.isAfter(now)) {
            return Optional.of(planned);
        }
        return allowedAt(now, zone) ? Optional.of(now) : Optional.empty();
    }

    /** Whether a push may go out at this instant in that time zone. */
    public static boolean allowedAt(Instant at, ZoneId zone) {
        LocalTime time = at.atZone(zone).toLocalTime();
        return !time.isBefore(EARLIEST) && !time.isAfter(LATEST);
    }

    private static LocalTime clamp(LocalTime time) {
        if (time.isBefore(EARLIEST)) {
            return EARLIEST;
        }
        return time.isAfter(LATEST) ? LATE_CLAMP : time;
    }
}
