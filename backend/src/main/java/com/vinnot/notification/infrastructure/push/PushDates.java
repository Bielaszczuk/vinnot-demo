package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;

import java.time.DateTimeException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.util.Locale;
import java.util.Objects;

/** Event times in pushes, in the event's own time zone (UTC when unknown or invalid) and the device language. */
final class PushDates {
    private PushDates() {
    }

    /** For example "Oct 21, 2026, 8:00 PM". */
    static String dateTime(String instant, String timeZone, NotificationLocale locale) {
        return format(DateTimeFormatter.ofLocalizedDateTime(FormatStyle.MEDIUM, FormatStyle.SHORT), instant, timeZone, locale);
    }

    /** For example "20:00". */
    static String time(String instant, String timeZone, NotificationLocale locale) {
        return format(DateTimeFormatter.ofLocalizedTime(FormatStyle.SHORT), instant, timeZone, locale);
    }

    private static String format(DateTimeFormatter style, String instant, String timeZone, NotificationLocale locale) {
        return style.withLocale(Locale.forLanguageTag(locale.language())).withZone(zone(timeZone)).format(Instant.parse(instant));
    }

    private static ZoneId zone(String id) {
        try {
            return Objects.isNull(id) || id.isBlank() ? ZoneId.of("UTC") : ZoneId.of(id);
        } catch (DateTimeException invalid) {
            return ZoneId.of("UTC");
        }
    }
}
