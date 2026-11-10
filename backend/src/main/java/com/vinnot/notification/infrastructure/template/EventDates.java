package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.domain.model.NotificationRequest;

import java.time.DateTimeException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.util.Locale;
import java.util.Objects;

/**
 * Event dates in the event's own time zone ({@code timeZone}, an IANA id), followed by that zone, so every
 * recipient reads the venue's local time. Messages queued before events had a zone, or with an unknown
 * zone, are shown in UTC and say so.
 */
final class EventDates {
    private static final ZoneId UTC = ZoneId.of("UTC");
    private final DateTimeFormatter format;
    private final String zoneLabel;

    private EventDates(NotificationRequest request) {
        ZoneId zone = zone(request.data().get("timeZone"));
        this.format = DateTimeFormatter.ofLocalizedDateTime(FormatStyle.MEDIUM)
                .withLocale(Locale.forLanguageTag(request.locale().language())).withZone(zone);
        this.zoneLabel = zone.getId().replace('_', ' ');
    }

    static EventDates of(NotificationRequest request) {
        return new EventDates(request);
    }

    /** For example "20 oct 2026, 09:00:00 (America/Argentina/Buenos Aires)". */
    String format(String instant) {
        return format.format(Instant.parse(instant)) + " (" + zoneLabel + ")";
    }

    private static ZoneId zone(String id) {
        if (Objects.isNull(id) || id.isBlank()) {
            return UTC;
        }
        try {
            return ZoneId.of(id);
        } catch (DateTimeException invalid) {
            return UTC;
        }
    }
}
