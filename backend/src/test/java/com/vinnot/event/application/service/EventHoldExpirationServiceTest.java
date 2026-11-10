package com.vinnot.event.application.service;

import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.model.EventRegistration;
import com.vinnot.event.domain.valueobject.EventDateRange;
import com.vinnot.event.domain.valueobject.EventRegistrationStatus;
import com.vinnot.event.domain.valueobject.EventType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EventHoldExpirationServiceTest {
    private static final Instant NOW = Instant.parse("2035-01-01T12:00:00Z");

    @Mock
    private EventRepositoryPort events;
    @Mock
    private EventRegistrationRepositoryPort registrations;

    private EventHoldExpirationService service;

    @BeforeEach
    void setUp() {
        service = new EventHoldExpirationService(events, registrations);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void expiresBothKindsOfHoldsOnceAndLocksEventBeforeRegistration(boolean paid) {
        Event event = event();
        EventRegistration registration = registration(event.getId());
        if (paid) {
            registration.approvePaid(NOW);
        } else {
            registration.approveFree(NOW, true);
        }
        event.holdAttendees(registration.getAttendeeCount());
        load(event, registration);

        service.expire(registration, NOW);

        var order = inOrder(events, registrations);
        order.verify(events).findByIdForUpdate(event.getId());
        order.verify(registrations).findByIdForUpdate(registration.getId());
        order.verify(events).save(event);
        order.verify(registrations).save(registration);
        assertThat(registration.getStatus()).isEqualTo(EventRegistrationStatus.EXPIRED);
        assertThat(event.getCapacity().getHeldAttendees()).isZero();
        assertThat(event.getCapacity().getAvailableSpots()).isEqualTo(10);

        service.expire(registration, NOW.plusSeconds(1));

        verify(events).save(event);
        verify(registrations).save(registration);
    }

    @Test
    void ignoresARegistrationDeletedAfterCandidateSelection() {
        Event event = event();
        EventRegistration candidate = registration(event.getId());
        when(events.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        when(registrations.findByIdForUpdate(candidate.getId())).thenReturn(Optional.empty());

        service.expire(candidate, NOW);

        verify(events, never()).save(any());
        verify(registrations, never()).save(any());
    }

    @Test
    void keepsAHoldThatHasNotReachedItsDeadline() {
        Event event = event();
        EventRegistration registration = registration(event.getId());
        registration.approvePaid(NOW.plusSeconds(1));
        event.holdAttendees(registration.getAttendeeCount());
        load(event, registration);

        service.expire(registration, NOW);

        assertThat(registration.getStatus()).isEqualTo(EventRegistrationStatus.AWAITING_PAYMENT);
        assertThat(event.getCapacity().getHeldAttendees()).isEqualTo(3);
        verify(events, never()).save(any());
        verify(registrations, never()).save(any());
    }

    @Test
    void rechecksPersistedStateInsteadOfExpiringAStaleCandidate() {
        Event event = event();
        EventRegistration confirmed = registration(event.getId());
        confirmed.approveFree(null, false);
        EventRegistration candidate = mock(EventRegistration.class);
        when(candidate.getEventId()).thenReturn(event.getId());
        when(candidate.getId()).thenReturn(confirmed.getId());
        when(events.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        when(registrations.findByIdForUpdate(candidate.getId())).thenReturn(Optional.of(confirmed));

        service.expire(candidate, NOW);

        assertThat(confirmed.getStatus()).isEqualTo(EventRegistrationStatus.CONFIRMED);
        verify(events, never()).save(any());
        verify(registrations, never()).save(any());
    }

    @Test
    void expiresAnOrphanedHoldWithoutWritingAnEvent() {
        EventRegistration registration = registration(UUID.randomUUID());
        registration.approvePaid(NOW.minusSeconds(1));
        when(events.findByIdForUpdate(registration.getEventId())).thenReturn(Optional.empty());
        when(registrations.findByIdForUpdate(registration.getId())).thenReturn(Optional.of(registration));

        service.expire(registration, NOW);

        assertThat(registration.getStatus()).isEqualTo(EventRegistrationStatus.EXPIRED);
        verify(events, never()).save(any());
        verify(registrations).save(registration);
    }

    @Test
    void propagatesPersistenceFailureInsteadOfCompletingTheRegistration() {
        Event event = event();
        EventRegistration registration = registration(event.getId());
        registration.approvePaid(NOW.minusSeconds(1));
        event.holdAttendees(registration.getAttendeeCount());
        load(event, registration);
        IllegalStateException failure = new IllegalStateException("Persistence unavailable");
        when(events.save(event)).thenThrow(failure);

        assertThatThrownBy(() -> service.expire(registration, NOW)).isSameAs(failure);

        assertThat(registration.getStatus()).isEqualTo(EventRegistrationStatus.AWAITING_PAYMENT);
        verify(registrations, never()).save(any());
    }

    private void load(Event event, EventRegistration registration) {
        when(events.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        when(registrations.findByIdForUpdate(registration.getId())).thenReturn(Optional.of(registration));
    }

    private Event event() {
        Instant start = NOW.plus(3, ChronoUnit.DAYS);
        Event event = Event.create("Hold expiration", EventType.TASTING,
                EventDateRange.of(start, start.plus(2, ChronoUnit.HOURS)), UUID.randomUUID());
        event.updateCapacity(10);
        event.publish();
        return event;
    }

    private EventRegistration registration(UUID eventId) {
        return EventRegistration.request(eventId, UUID.randomUUID(), 3,
                "Test Guest", "guest@example.invalid", null, null,
                List.of(), "ARS", new BigDecimal("30000"));
    }
}
