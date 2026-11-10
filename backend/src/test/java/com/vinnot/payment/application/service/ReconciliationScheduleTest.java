package com.vinnot.payment.application.service;

import org.junit.jupiter.api.Test;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;

class ReconciliationScheduleTest {
    private static final Instant NOW = Instant.parse("2026-10-17T12:00:00Z");

    private static Instant expiredAgo(Duration age) {
        return NOW.minus(age);
    }

    @Test
    void pollsEveryFiveMinutesWhileTheCheckoutCanStillBePaidEvenIfSettled() {
        assertThat(ReconciliationSchedule.afterSuccess(NOW.plus(Duration.ofMinutes(20)), false, NOW))
                .contains(NOW.plus(Duration.ofMinutes(5)));
        assertThat(ReconciliationSchedule.afterSuccess(expiredAgo(Duration.ofMinutes(59)), true, NOW))
                .contains(NOW.plus(Duration.ofMinutes(5)));
    }

    @Test
    void parksSettledAttemptsAfterTheGraceAndEveryAttemptAfterTheHorizon() {
        assertThat(ReconciliationSchedule.afterSuccess(expiredAgo(Duration.ofHours(1)), true, NOW)).isEmpty();
        assertThat(ReconciliationSchedule.afterSuccess(expiredAgo(Duration.ofDays(180)), false, NOW)).isEmpty();
    }

    @Test
    void backsOffUnsettledAttemptsByAge() {
        assertThat(ReconciliationSchedule.afterSuccess(expiredAgo(Duration.ofHours(2)), false, NOW))
                .contains(NOW.plus(Duration.ofMinutes(30)));
        assertThat(ReconciliationSchedule.afterSuccess(expiredAgo(Duration.ofDays(3)), false, NOW))
                .contains(NOW.plus(Duration.ofHours(6)));
        assertThat(ReconciliationSchedule.afterSuccess(expiredAgo(Duration.ofDays(30)), false, NOW))
                .contains(NOW.plus(Duration.ofHours(24)));
    }

    @Test
    void retriesFailuresQuicklyWhileActiveAndWithBackoffOnceOld() {
        assertThat(ReconciliationSchedule.afterFailure(Optional.empty(), NOW)).isEqualTo(NOW.plus(Duration.ofMinutes(1)));
        assertThat(ReconciliationSchedule.afterFailure(Optional.of(expiredAgo(Duration.ofMinutes(10))), NOW))
                .isEqualTo(NOW.plus(Duration.ofMinutes(1)));
        assertThat(ReconciliationSchedule.afterFailure(Optional.of(expiredAgo(Duration.ofDays(3))), NOW))
                .isEqualTo(NOW.plus(Duration.ofHours(6)));
        assertThat(ReconciliationSchedule.afterFailure(Optional.of(expiredAgo(Duration.ofDays(400))), NOW))
                .isEqualTo(NOW.plus(Duration.ofHours(24)));
    }
}
