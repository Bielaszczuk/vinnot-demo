package com.vinnot.notification.domain.model;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

class QuietHoursTest {
    private static final ZoneId BUENOS_AIRES = ZoneId.of("America/Argentina/Buenos_Aires");

    @Test
    void lateEveningWaitsUntilEightTheNextMorningLocally() {
        // 23:30 in Buenos Aires (UTC-3).
        assertThat(QuietHours.endOf(Instant.parse("2026-10-21T02:30:00Z"), BUENOS_AIRES))
                .contains(Instant.parse("2026-10-21T11:00:00Z"));
        assertThat(QuietHours.endOf(Instant.parse("2026-10-21T01:00:00Z"), BUENOS_AIRES))
                .as("22:00 sharp is already quiet").contains(Instant.parse("2026-10-21T11:00:00Z"));
    }

    @Test
    void earlyMorningWaitsUntilEightThatDay() {
        assertThat(QuietHours.endOf(Instant.parse("2026-10-21T09:15:00Z"), BUENOS_AIRES))
                .contains(Instant.parse("2026-10-21T11:00:00Z"));
    }

    /** S11: engagement pushes never go out between 22:00 and 09:00 locally. */
    @Test
    void engagementPushesWaitUntilNineInTheMorning() {
        assertThat(QuietHours.engagementEndOf(Instant.parse("2026-10-21T11:30:00Z"), BUENOS_AIRES))
                .as("08:30").contains(Instant.parse("2026-10-21T12:00:00Z"));
        assertThat(QuietHours.engagementEndOf(Instant.parse("2026-10-21T02:30:00Z"), BUENOS_AIRES))
                .as("23:30").contains(Instant.parse("2026-10-21T12:00:00Z"));
        assertThat(QuietHours.engagementEndOf(Instant.parse("2026-10-21T12:00:00Z"), BUENOS_AIRES)).as("09:00").isEmpty();
        assertThat(QuietHours.engagementEndOf(Instant.parse("2026-10-21T00:59:00Z"), BUENOS_AIRES)).as("21:59").isEmpty();
    }

    @Test
    void daytimeIsNotQuietAndTheZoneDecides() {
        assertThat(QuietHours.endOf(Instant.parse("2026-10-21T11:00:00Z"), BUENOS_AIRES)).isEmpty();
        assertThat(QuietHours.endOf(Instant.parse("2026-10-21T00:59:00Z"), BUENOS_AIRES)).isEmpty();
        assertThat(QuietHours.endOf(Instant.parse("2026-10-21T02:30:00Z"), ZoneId.of("Asia/Tokyo"))).isEmpty();
    }
}
