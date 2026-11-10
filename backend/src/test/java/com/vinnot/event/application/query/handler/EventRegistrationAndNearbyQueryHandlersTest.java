package com.vinnot.event.application.query.handler;

import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.query.model.GetEventRegistrationsQuery;
import com.vinnot.event.application.query.model.GetMyEventRegistrationQuery;
import com.vinnot.event.application.query.model.GetNearbyEventsQuery;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.model.EventRegistration;
import com.vinnot.event.domain.valueobject.EventDateRange;
import com.vinnot.event.domain.valueobject.EventLocation;
import com.vinnot.event.domain.valueobject.EventRegistrationStatus;
import com.vinnot.event.domain.valueobject.EventType;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.Coordinates;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class EventRegistrationAndNearbyQueryHandlersTest {

    private EventRepositoryPort events;
    private EventRegistrationRepositoryPort registrations;

    @BeforeEach
    void setUp() {
        events = mock(EventRepositoryPort.class);
        registrations = mock(EventRegistrationRepositoryPort.class);
    }

    @Test
    void organizerAndAdminCanPageRegistrations() {
        Event event = event(0, 0);
        EventRegistration registration = registration(event);
        when(events.findById(event.getId())).thenReturn(Optional.of(event));
        when(registrations.findByEvent(any(), any(), any()))
                .thenReturn(PageResult.of(List.of(registration), 0, 10, 1));

        var organizer = new GetEventRegistrationsQueryHandler(events, registrations)
                .execute(new GetEventRegistrationsQuery(event.getId(), event.getOrganizerId(),
                        false, EventRegistrationStatus.REQUESTED, 0, 10));
        var admin = new GetEventRegistrationsQueryHandler(events, registrations)
                .execute(new GetEventRegistrationsQuery(event.getId(), UUID.randomUUID(),
                        true, null, 0, 10));

        assertThat(organizer.content()).hasSize(1);
        assertThat(admin.content()).hasSize(1);
    }

    @Test
    void registrationListingProtectsOwnershipAndMissingEvents() {
        Event event = event(0, 0);
        when(events.findById(event.getId())).thenReturn(Optional.of(event));
        var handler = new GetEventRegistrationsQueryHandler(events, registrations);
        assertThatThrownBy(() -> handler.execute(new GetEventRegistrationsQuery(
                event.getId(), UUID.randomUUID(), false, null, 0, 10)))
                .isInstanceOf(BusinessRuleViolationException.class);

        UUID missing = UUID.randomUUID();
        when(events.findById(missing)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> handler.execute(new GetEventRegistrationsQuery(
                missing, UUID.randomUUID(), true, null, 0, 10)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void getsOwnRegistrationOrReportsItsAbsence() {
        Event event = event(0, 0);
        EventRegistration registration = registration(event);
        when(registrations.findByEventIdAndUserId(event.getId(), registration.getUserId()))
                .thenReturn(Optional.of(registration));
        var handler = new GetMyEventRegistrationQueryHandler(registrations);
        assertThat(handler.execute(new GetMyEventRegistrationQuery(
                event.getId(), registration.getUserId())).id()).isEqualTo(registration.getId());

        assertThatThrownBy(() -> handler.execute(new GetMyEventRegistrationQuery(
                UUID.randomUUID(), UUID.randomUUID())))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void filtersSortsAndPagesNearbyEvents() {
        Event closest = event(-34.6037, -58.3816);
        Event farther = event(-34.61, -58.39);
        Event outside = event(-35.5, -58.4);
        Event withoutCoordinates = event(0, 0);
        withoutCoordinates.updateLocation(EventLocation.of(
                "Venue", null, null, null, null, null, null));
        when(events.findNearby(any(double.class), any(double.class), any(double.class), any(int.class)))
                .thenReturn(List.of(farther, withoutCoordinates, outside, closest));
        var handler = new GetNearbyEventsQueryHandler(events);

        var firstPage = handler.execute(new GetNearbyEventsQuery(
                -34.6037, -58.3816, 10, 0, 1));
        var secondPage = handler.execute(new GetNearbyEventsQuery(
                -34.6037, -58.3816, 10, 1, 1));
        var emptyPage = handler.execute(new GetNearbyEventsQuery(
                -34.6037, -58.3816, 10, 5, 1));

        assertThat(firstPage.content()).singleElement()
                .satisfies(item -> assertThat(item.id()).isEqualTo(closest.getId()));
        assertThat(secondPage.content()).hasSize(1);
        assertThat(emptyPage.content()).isEmpty();
        assertThat(firstPage.totalElements()).isEqualTo(2);
    }

    private Event event(double latitude, double longitude) {
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);
        Event event = Event.create("Tasting", EventType.TASTING,
                EventDateRange.of(start, start.plus(2, ChronoUnit.HOURS)), UUID.randomUUID());
        if (latitude != 0 || longitude != 0) {
            event.updateLocation(EventLocation.of("Venue", null, null, null, null,
                    Coordinates.of(BigDecimal.valueOf(latitude), BigDecimal.valueOf(longitude)), null));
        }
        return event;
    }

    private EventRegistration registration(Event event) {
        return EventRegistration.request(event.getId(), UUID.randomUUID(), 1,
                "Guest", "guest@vinnot.com", null, null, List.of(), "ARS", BigDecimal.ZERO);
    }
}
