package com.vinnot.marketing.domain.model;

import java.time.LocalDate;
import java.util.Objects;

/**
 * A day worth a post (#489): its rule resolves the date of a given year. Priority 1 must be posted, 3 is nice to have.
 *
 * @param countryCode ISO 3166-1 alpha-2 of the country that celebrates it, or null when it is international
 */
public record WineDay(String code, String nameEs, String nameEn, WineDayKind kind, DateRule rule, int priority,
        String countryCode) {
    public static final int MUST_POST = 1;
    public static final int NICE_TO_HAVE = 3;

    public WineDay {
        Objects.requireNonNull(code, "code");
        Objects.requireNonNull(nameEs, "nameEs");
        Objects.requireNonNull(nameEn, "nameEn");
        Objects.requireNonNull(kind, "kind");
        Objects.requireNonNull(rule, "rule");
        if (priority < MUST_POST || priority > NICE_TO_HAVE) {
            throw new IllegalArgumentException("Priority must be between " + MUST_POST + " and " + NICE_TO_HAVE + ", got " + priority);
        }
    }

    public LocalDate on(int year) {
        return rule.resolve(year);
    }
}
