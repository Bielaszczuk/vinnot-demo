package com.vinnot.event.application.command.handler;

import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.model.EventRegistration;
import com.vinnot.event.domain.valueobject.EventDateRange;
import com.vinnot.event.domain.valueobject.EventRegistrationStatus;
import com.vinnot.event.domain.valueobject.EventType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import com.vinnot.event.application.service.EventHoldExpirationService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MaintainEventLifecycleCommandHandlerTest {

    @Mock
    private EventRepositoryPort eventRepository;
    @Mock
    private EventRegistrationRepositoryPort registrationRepository;

    @Test
    void completesPastEventsAndReleasesExpiredRegistrationHolds() {
        Instant now = Instant.now();
        Event event = publishedEvent();
        EventRegistration registration = paidRegistration(event.getId());
        event.holdAttendees(registration.getAttendeeCount());
        registration.approvePaid(now.minus(1, ChronoUnit.MINUTES));
        when(registrationRepository.findExpiredHolds(now, 200))
                .thenReturn(List.of(registration));
        when(registrationRepository.findByIdForUpdate(registration.getId()))
                .thenReturn(Optional.of(registration));
        when(eventRepository.findByIdForUpdate(event.getId()))
                .thenReturn(Optional.of(event));

        handler().execute(now);

        assertThat(registration.getStatus()).isEqualTo(EventRegistrationStatus.EXPIRED);
        assertThat(event.getCapacity().getHeldAttendees()).isZero();
        assertThat(event.getCapacity().getAvailableSpots()).isEqualTo(10);
        verify(eventRepository).completeExpiredEvents(now);
        verify(eventRepository).save(event);
        verify(registrationRepository).save(registration);
    }

    @Test
    void ignoresStaleCandidatesAndExpiresOrphanedRegistrationHolds() {
        Instant now = Instant.now();
        Event event = publishedEvent();
        EventRegistration missing = paidRegistration(event.getId());
        EventRegistration noLongerExpired = paidRegistration(event.getId());
        EventRegistration orphaned = paidRegistration(event.getId());
        noLongerExpired.approvePaid(now.plus(1, ChronoUnit.HOURS));
        orphaned.approvePaid(now.minus(1, ChronoUnit.MINUTES));
        when(registrationRepository.findExpiredHolds(now, 200))
                .thenReturn(List.of(missing, noLongerExpired, orphaned));
        when(registrationRepository.findByIdForUpdate(missing.getId()))
                .thenReturn(Optional.empty());
        when(registrationRepository.findByIdForUpdate(noLongerExpired.getId()))
                .thenReturn(Optional.of(noLongerExpired));
        when(registrationRepository.findByIdForUpdate(orphaned.getId()))
                .thenReturn(Optional.of(orphaned));
        when(eventRepository.findByIdForUpdate(orphaned.getEventId()))
                .thenReturn(Optional.empty());

        handler().execute(now);

        assertThat(orphaned.getStatus()).isEqualTo(EventRegistrationStatus.EXPIRED);
        assertThat(noLongerExpired.getStatus())
                .isEqualTo(EventRegistrationStatus.AWAITING_PAYMENT);
        verify(registrationRepository).save(orphaned);
    }

    private MaintainEventLifecycleCommandHandler handler() {
        return new MaintainEventLifecycleCommandHandler(
                eventRepository,
                registrationRepository,
                new EventHoldExpirationService(eventRepository, registrationRepository));
    }

    private Event publishedEvent() {
        Instant start = Instant.now().plus(3, ChronoUnit.DAYS);
        Event event = Event.create(
                "Lifecycle tasting",
                EventType.TASTING,
                EventDateRange.of(start, start.plus(2, ChronoUnit.HOURS)),
                UUID.randomUUID());
        event.updateCapacity(10);
        event.publish();
        return event;
    }

    private EventRegistration paidRegistration(UUID eventId) {
        return EventRegistration.request(
                eventId,
                UUID.randomUUID(),
                3,
                "Wine Guest",
                "guest@vinnot.com",
                null,
                null,
                List.of(),
                "ARS",
                new BigDecimal("30000"));
    }
}
