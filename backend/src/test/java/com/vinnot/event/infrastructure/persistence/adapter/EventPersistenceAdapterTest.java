package com.vinnot.event.infrastructure.persistence.adapter;

import com.vinnot.event.application.port.out.EventRegistrationPointsPort;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.valueobject.EventDateRange;
import com.vinnot.event.domain.valueobject.EventType;
import com.vinnot.event.infrastructure.persistence.entity.EventRegistrationJpaEntity;
import com.vinnot.event.infrastructure.persistence.jpa.EventJpaRepository;
import com.vinnot.event.infrastructure.persistence.jpa.EventRegistrationJpaRepository;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** #455: cancelling an event takes the attendees' points back one member after another, in user id order. */
class EventPersistenceAdapterTest {
    private final EventJpaRepository events = mock(EventJpaRepository.class);
    private final EventRegistrationJpaRepository registrations = mock(EventRegistrationJpaRepository.class);
    private final EventRegistrationPointsPort points = mock(EventRegistrationPointsPort.class);
    private final EventPersistenceAdapter adapter = new EventPersistenceAdapter(events, registrations, points);

    @Test
    void aCancellationRevokesTheConfirmedAttendeesSortedByUserIdSoConcurrentOnesLockInOneOrder() {
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);
        Event event = Event.create("Tasting", EventType.TASTING, EventDateRange.of(start, start.plus(2, ChronoUnit.HOURS)),
                UUID.randomUUID());
        event.cancel();
        UUID first = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID second = UUID.fromString("7fffffff-0000-0000-0000-000000000000");
        UUID third = UUID.fromString("ffffffff-0000-0000-0000-000000000000");
        EventRegistrationJpaEntity last = registration(third);
        EventRegistrationJpaEntity early = registration(first);
        EventRegistrationJpaEntity middle = registration(second);
        when(events.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(registrations.findAllByEventIdAndStatus(event.getId(),
                EventRegistrationJpaEntity.RegistrationStatusEnum.CONFIRMED)).thenReturn(List.of(last, early, middle));
        when(registrations.cancelActiveForEvent(event.getId(), null)).thenReturn(3);

        assertThat(adapter.saveCancellation(event, null)).isEqualTo(3);

        InOrder order = inOrder(points);
        order.verify(points).registrationEnded(first, early.getId());
        order.verify(points).registrationEnded(second, middle.getId());
        order.verify(points).registrationEnded(third, last.getId());
    }

    private static EventRegistrationJpaEntity registration(UUID user) {
        EventRegistrationJpaEntity registration = new EventRegistrationJpaEntity();
        registration.setId(UUID.randomUUID());
        registration.setUserId(user);
        return registration;
    }
}
