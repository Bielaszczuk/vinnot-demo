package com.vinnot.event.domain.valueobject;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EventRegistrationSettingsTest {

    @Test
    void providesConsistentRegistrationDefaults() {
        EventRegistrationSettings settings = EventRegistrationSettings.defaults();

        assertThat(settings.getCurrency()).isEqualTo("ARS");
        assertThat(settings.getMaxTicketsPerRegistration()).isEqualTo(6);
        assertThat(settings.getApprovalMode()).isEqualTo(EventApprovalMode.MANUAL);
        assertThat(settings.isAttendeeConfirmationRequired()).isTrue();
        assertThat(settings.getHoldMinutes()).isEqualTo(1440);
    }

    @Test
    void usesEventStartWhenConfiguredDeadlineIsLater() {
        Instant start = Instant.now().plus(10, ChronoUnit.DAYS);
        EventRegistrationSettings settings = EventRegistrationSettings.of(
                "usd",
                start.plus(1, ChronoUnit.DAYS),
                4,
                EventApprovalMode.AUTOMATIC,
                false,
                60,
                null,
                null,
                null);

        assertThat(settings.getCurrency()).isEqualTo("USD");
        assertThat(settings.effectiveDeadline(start)).isEqualTo(start);
        assertThat(settings.acceptsRegistrationsAt(
                start.minus(1, ChronoUnit.SECONDS), start)).isTrue();
        assertThat(settings.acceptsRegistrationsAt(start, start)).isFalse();
    }

    @Test
    void holdsAPlaceForTheConfiguredTimeButNeverPastTheEventStart() {
        EventRegistrationSettings settings = EventRegistrationSettings.defaults();
        Instant now = Instant.parse("2026-10-20T23:25:00Z");

        Instant farStart = now.plus(3, ChronoUnit.DAYS);
        assertThat(settings.holdUntil(now, farStart)).isEqualTo(now.plus(1440, ChronoUnit.MINUTES));

        Instant startTonight = now.plus(35, ChronoUnit.MINUTES);
        assertThat(settings.holdUntil(now, startTonight)).isEqualTo(startTonight);
    }

    @Test
    void rejectsLimitsOutsideTheBusinessBounds() {
        assertThatThrownBy(() -> EventRegistrationSettings.of(
                "ARS", null, 21, null, null, null, null, null, null))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_REGISTRATION_LIMIT");
        assertThatThrownBy(() -> EventRegistrationSettings.of(
                "ARS", null, 6, null, null, 4, null, null, null))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_HOLD_DURATION");
    }
}
