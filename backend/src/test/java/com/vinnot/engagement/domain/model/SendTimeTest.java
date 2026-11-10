package com.vinnot.engagement.domain.model;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.OptionalInt;

import static org.assertj.core.api.Assertions.assertThat;

/** S11: the usual open hour, fallbacks, and never between 22:00 and 09:00 local. */
class SendTimeTest {
    private static final ZoneId BUENOS_AIRES = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final LocalDate WEDNESDAY = LocalDate.of(2026, 10, 21);
    private static final LocalDate SATURDAY = LocalDate.of(2026, 10, 24);

    @Test
    void theUsualOpenHourInTheAccountsTimeZone() {
        assertThat(SendTime.on(WEDNESDAY, BUENOS_AIRES, OptionalInt.of(20)).toInstant())
                .isEqualTo(Instant.parse("2026-10-21T23:00:00Z"));
        assertThat(SendTime.on(WEDNESDAY, ZoneId.of("Europe/Madrid"), OptionalInt.of(13)).toLocalTime())
                .isEqualTo(LocalTime.of(13, 0));
    }

    @Test
    void withoutAUsualHourWeekdaysAt1930AndWeekendsAt1230() {
        assertThat(SendTime.on(WEDNESDAY, BUENOS_AIRES, OptionalInt.empty()).toLocalTime()).isEqualTo(LocalTime.of(19, 30));
        assertThat(SendTime.on(SATURDAY, BUENOS_AIRES, OptionalInt.empty()).toLocalTime()).isEqualTo(LocalTime.of(12, 30));
        assertThat(SendTime.on(SATURDAY.plusDays(1), BUENOS_AIRES, OptionalInt.empty()).toLocalTime()).isEqualTo(LocalTime.of(12, 30));
    }

    @Test
    void neverBetween2200And0900Local() {
        assertThat(SendTime.on(WEDNESDAY, BUENOS_AIRES, OptionalInt.of(2)).toLocalTime()).isEqualTo(LocalTime.of(9, 0));
        assertThat(SendTime.on(WEDNESDAY, BUENOS_AIRES, OptionalInt.of(8)).toLocalTime()).isEqualTo(LocalTime.of(9, 0));
        assertThat(SendTime.on(WEDNESDAY, BUENOS_AIRES, OptionalInt.of(9)).toLocalTime()).isEqualTo(LocalTime.of(9, 0));
        assertThat(SendTime.on(WEDNESDAY, BUENOS_AIRES, OptionalInt.of(21)).toLocalTime()).isEqualTo(LocalTime.of(21, 0));
        assertThat(SendTime.on(WEDNESDAY, BUENOS_AIRES, OptionalInt.of(22)).toLocalTime()).isEqualTo(LocalTime.of(21, 0));
        assertThat(SendTime.on(WEDNESDAY, BUENOS_AIRES, OptionalInt.of(23)).toLocalTime()).isEqualTo(LocalTime.of(21, 0));
        assertThat(SendTime.allowedAt(Instant.parse("2026-10-21T12:00:00Z"), BUENOS_AIRES)).as("09:00").isTrue();
        assertThat(SendTime.allowedAt(Instant.parse("2026-10-22T00:59:00Z"), BUENOS_AIRES)).as("21:59").isTrue();
        assertThat(SendTime.allowedAt(Instant.parse("2026-10-22T01:00:00Z"), BUENOS_AIRES)).as("22:00").isFalse();
        assertThat(SendTime.allowedAt(Instant.parse("2026-10-21T11:59:00Z"), BUENOS_AIRES)).as("08:59").isFalse();
    }

    @Test
    void aLateRunSendsAtOnceInsideTheWindowAndNothingAfterIt() {
        Instant planning = Instant.parse("2026-10-21T07:00:00Z");
        assertThat(SendTime.next(planning, BUENOS_AIRES, OptionalInt.of(20))).contains(Instant.parse("2026-10-21T23:00:00Z"));
        Instant lateMorning = Instant.parse("2026-10-21T13:15:00Z");
        assertThat(SendTime.next(lateMorning, BUENOS_AIRES, OptionalInt.of(9))).contains(lateMorning);
        Instant night = Instant.parse("2026-10-22T01:30:00Z");
        assertThat(SendTime.next(night, BUENOS_AIRES, OptionalInt.of(9))).isEmpty();
    }
}
