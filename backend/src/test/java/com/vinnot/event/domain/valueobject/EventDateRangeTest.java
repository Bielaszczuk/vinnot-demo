package com.vinnot.event.domain.valueobject;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EventDateRangeTest {

    @Test
    void classifiesFutureOngoingAndPastRanges() {
        Instant now = Instant.now();

        assertThat(EventDateRange.of(
                now.plus(1, ChronoUnit.HOURS), now.plus(2, ChronoUnit.HOURS))
                .isFuture()).isTrue();
        assertThat(EventDateRange.of(
                now.minus(1, ChronoUnit.HOURS), now.plus(1, ChronoUnit.HOURS))
                .isOngoing()).isTrue();
        assertThat(EventDateRange.of(
                now.minus(2, ChronoUnit.HOURS), now.minus(1, ChronoUnit.HOURS))
                .isPast()).isTrue();
    }

    @Test
    void rejectsAnEndBeforeItsStart() {
        Instant start = Instant.now();
        assertThatThrownBy(() -> EventDateRange.of(
                start, start.minus(1, ChronoUnit.SECONDS)))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_DATE_RANGE");
    }
}
