package com.vinnot.marketing.domain.model;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Month;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.Locale;
import java.util.Objects;

/**
 * When a wine day falls in a given year (#489). Half of the days move every year, so each one is a rule, not a date:
 * {@code fixed:MM-DD}, {@code nth-weekday:MM:DOW:N} (N in 1..4), {@code last-weekday:MM:DOW} or
 * {@code offset-from:<rule>:<signed days>} ("the Thursday before Memorial Day" is the last Monday of May minus 4).
 */
public sealed interface DateRule permits DateRule.Fixed, DateRule.NthWeekday, DateRule.LastWeekday, DateRule.OffsetFrom {
    int MAX_OCCURRENCE = 4;
    int WEEKDAY_TOKEN_LENGTH = 3;

    LocalDate resolve(int year);

    /** The textual form {@link #parse(String)} reads back. */
    String serialize();

    static DateRule fixed(int month, int day) {
        return new Fixed(month, day);
    }

    static DateRule nthWeekday(int month, DayOfWeek weekday, int n) {
        return new NthWeekday(month, weekday, n);
    }

    static DateRule lastWeekday(int month, DayOfWeek weekday) {
        return new LastWeekday(month, weekday);
    }

    static DateRule offsetFrom(DateRule base, int days) {
        return new OffsetFrom(base, days);
    }

    static DateRule parse(String text) {
        String rule = Objects.requireNonNull(text, "rule").trim();
        try {
            if (rule.startsWith("fixed:")) {
                String[] monthDay = rule.substring("fixed:".length()).split("-");
                return fixed(Integer.parseInt(monthDay[0]), Integer.parseInt(monthDay[1]));
            }
            if (rule.startsWith("nth-weekday:")) {
                String[] parts = rule.substring("nth-weekday:".length()).split(":");
                return nthWeekday(Integer.parseInt(parts[0]), weekday(parts[1]), Integer.parseInt(parts[2]));
            }
            if (rule.startsWith("last-weekday:")) {
                String[] parts = rule.substring("last-weekday:".length()).split(":");
                return lastWeekday(Integer.parseInt(parts[0]), weekday(parts[1]));
            }
            if (rule.startsWith("offset-from:")) {
                String body = rule.substring("offset-from:".length());
                int cut = body.lastIndexOf(':');
                return offsetFrom(parse(body.substring(0, cut)), Integer.parseInt(body.substring(cut + 1)));
            }
        } catch (RuntimeException exception) {
            throw new IllegalArgumentException("Malformed date rule: " + text, exception);
        }
        throw new IllegalArgumentException("Unknown date rule: " + text);
    }

    private static DayOfWeek weekday(String token) {
        return switch (token.toUpperCase(Locale.ROOT)) {
            case "MON" -> DayOfWeek.MONDAY;
            case "TUE" -> DayOfWeek.TUESDAY;
            case "WED" -> DayOfWeek.WEDNESDAY;
            case "THU" -> DayOfWeek.THURSDAY;
            case "FRI" -> DayOfWeek.FRIDAY;
            case "SAT" -> DayOfWeek.SATURDAY;
            case "SUN" -> DayOfWeek.SUNDAY;
            default -> throw new IllegalArgumentException("Unknown weekday: " + token);
        };
    }

    private static String token(DayOfWeek weekday) {
        return weekday.name().substring(0, WEEKDAY_TOKEN_LENGTH);
    }

    private static int validMonth(int month) {
        return Month.of(month).getValue();
    }

    record Fixed(int month, int day) implements DateRule {
        public Fixed {
            validMonth(month);
            if (day < 1 || day > Month.of(month).maxLength()) {
                throw new IllegalArgumentException("Day " + day + " is not valid for month " + month);
            }
        }

        @Override
        public LocalDate resolve(int year) {
            return LocalDate.of(year, month, Math.min(day, YearMonth.of(year, month).lengthOfMonth()));
        }

        @Override
        public String serialize() {
            return String.format("fixed:%02d-%02d", month, day);
        }
    }

    record NthWeekday(int month, DayOfWeek weekday, int n) implements DateRule {
        public NthWeekday {
            validMonth(month);
            Objects.requireNonNull(weekday, "weekday");
            if (n < 1 || n > MAX_OCCURRENCE) {
                throw new IllegalArgumentException("The occurrence must be between 1 and " + MAX_OCCURRENCE + ", got " + n);
            }
        }

        @Override
        public LocalDate resolve(int year) {
            return LocalDate.of(year, month, 1).with(TemporalAdjusters.dayOfWeekInMonth(n, weekday));
        }

        @Override
        public String serialize() {
            return String.format("nth-weekday:%02d:%s:%d", month, token(weekday), n);
        }
    }

    record LastWeekday(int month, DayOfWeek weekday) implements DateRule {
        public LastWeekday {
            validMonth(month);
            Objects.requireNonNull(weekday, "weekday");
        }

        @Override
        public LocalDate resolve(int year) {
            return LocalDate.of(year, month, 1).with(TemporalAdjusters.lastInMonth(weekday));
        }

        @Override
        public String serialize() {
            return String.format("last-weekday:%02d:%s", month, token(weekday));
        }
    }

    record OffsetFrom(DateRule base, int days) implements DateRule {
        public OffsetFrom {
            Objects.requireNonNull(base, "base");
        }

        @Override
        public LocalDate resolve(int year) {
            return base.resolve(year).plusDays(days);
        }

        @Override
        public String serialize() {
            return "offset-from:" + base.serialize() + ":" + days;
        }
    }
}
