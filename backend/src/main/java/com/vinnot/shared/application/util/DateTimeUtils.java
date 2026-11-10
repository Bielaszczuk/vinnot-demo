package com.vinnot.shared.application.util;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Objects;

/**
 * Utility class for flexible date and time parsing.
 * Supports multiple date formats commonly sent by frontend applications.
 *
 * <p>Located in the application layer because it is used by controllers
 * and command/query construction across multiple modules.</p>
 */
public final class DateTimeUtils {

    private DateTimeUtils() {

    }

    /**
     * Parses a date string flexibly to an Instant.
     * Supports ISO-8601 with zone (e.g. "2026-03-07T23:26:00Z"),
     * ISO local datetime (e.g. "2026-03-07T23:26:00"),
     * and datetime without seconds (e.g. "2026-03-07T23:26").
     *
     * @param dateString the date string to parse
     * @return the parsed Instant in UTC, or null if input is null/blank
     */
    public static Instant parseFlexibleInstant(String dateString) {
        if (Objects.isNull(dateString) || dateString.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(dateString);
        } catch (DateTimeParseException ignored) {
        }
        try {
            LocalDateTime localDateTime = LocalDateTime.parse(
                    dateString, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            return localDateTime.toInstant(ZoneOffset.UTC);
        } catch (DateTimeParseException ignored) {
        }
        LocalDateTime localDateTime = LocalDateTime.parse(
                dateString, DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"));
        return localDateTime.toInstant(ZoneOffset.UTC);
    }
}

