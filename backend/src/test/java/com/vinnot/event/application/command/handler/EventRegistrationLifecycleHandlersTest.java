package com.vinnot.event.application.command.handler;

import com.vinnot.event.application.command.model.CancelEventRegistrationCommand;
import com.vinnot.event.application.command.model.ConfirmEventAttendanceCommand;
import com.vinnot.event.application.command.model.ReportEventPaymentCommand;
import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.model.EventRegistration;
import com.vinnot.event.domain.valueobject.EventDateRange;
import com.vinnot.event.domain.valueobject.EventPaymentMethod;
import com.vinnot.event.domain.valueobject.EventPaymentStatus;
import com.vinnot.event.domain.valueobject.EventRegistrationStatus;
import com.vinnot.event.domain.valueobject.EventType;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;

class EventRegistrationLifecycleHandlersTest {

    private EventRepositoryPort events;
    private EventRegistrationRepositoryPort registrations;

    @BeforeEach
    void setUp() {
        events = mock(EventRepositoryPort.class);
        registrations = mock(EventRegistrationRepositoryPort.class);
        when(registrations.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(registrations.save(any(), any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void confirmsAttendanceAndHeldCapacityForOwner() {
        Event event = event();
        EventRegistration registration = request(event, BigDecimal.ZERO);
        event.holdAttendees(1);
        registration.approveFree(Instant.now().plus(1, ChronoUnit.HOURS), true);
        when(registrations.findEventId(registration.getId())).thenReturn(Optional.of(event.getId()));
        when(registrations.findByIdForUpdate(registration.getId()))
                .thenReturn(Optional.of(registration));
        when(events.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));

        var response = new ConfirmEventAttendanceCommandHandler(events, registrations)
                .execute(new ConfirmEventAttendanceCommand(
                        registration.getId(), registration.getUserId()));

        assertThat(response.status()).isEqualTo(EventRegistrationStatus.CONFIRMED.name());
        assertThat(event.getCapacity().getCurrentAttendees()).isEqualTo(1);
    }

    @Test
    void protectsAttendanceAndPaymentByOwnership() {
        Event event = event();
        EventRegistration registration = request(event, new BigDecimal("100"));
        when(registrations.findEventId(registration.getId())).thenReturn(Optional.of(event.getId()));
        when(registrations.findByIdForUpdate(registration.getId()))
                .thenReturn(Optional.of(registration));

        when(events.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        assertThatThrownBy(() -> new ConfirmEventAttendanceCommandHandler(events, registrations)
                .execute(new ConfirmEventAttendanceCommand(registration.getId(), UUID.randomUUID())))
                .isInstanceOf(BusinessRuleViolationException.class);
        assertThatThrownBy(() -> new ReportEventPaymentCommandHandler(registrations)
                .execute(new ReportEventPaymentCommand(
                        registration.getId(), UUID.randomUUID(), EventPaymentMethod.TRANSFER)))
                .isInstanceOf(BusinessRuleViolationException.class);
    }

    @Test
    void refusesUnverifiedTransferPaymentForOwner() {
        Event event = event();
        EventRegistration registration = request(event, new BigDecimal("100"));
        registration.approvePaid(Instant.now().plus(1, ChronoUnit.HOURS));
        when(registrations.findByIdForUpdate(registration.getId()))
                .thenReturn(Optional.of(registration));

        assertThatThrownBy(() -> new ReportEventPaymentCommandHandler(registrations).execute(
                new ReportEventPaymentCommand(registration.getId(), registration.getUserId(), EventPaymentMethod.TRANSFER)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code").isEqualTo("PAYMENT_PROVIDER_VERIFICATION_REQUIRED");
        assertThat(registration.getPaymentStatus()).isEqualTo(EventPaymentStatus.PENDING);
        verify(registrations, never()).save(any());
    }

    @Test
    void cancelsHeldAndConfirmedRegistrationsReleasingTheirCapacity() {
        Event heldEvent = event();
        EventRegistration held = request(heldEvent, new BigDecimal("100"));
        heldEvent.holdAttendees(1);
        held.approvePaid(Instant.now().plus(1, ChronoUnit.HOURS));
        stubCancellation(heldEvent, held);
        new CancelEventRegistrationCommandHandler(events, registrations)
                .execute(new CancelEventRegistrationCommand(heldEvent.getId(), held.getUserId()));
        assertThat(heldEvent.getCapacity().getHeldAttendees()).isZero();

        Event confirmedEvent = event();
        EventRegistration confirmed = request(confirmedEvent, BigDecimal.ZERO);
        confirmedEvent.confirmAttendees(1);
        confirmed.approveFree(null, false);
        stubCancellation(confirmedEvent, confirmed);
        new CancelEventRegistrationCommandHandler(events, registrations)
                .execute(new CancelEventRegistrationCommand(
                        confirmedEvent.getId(), confirmed.getUserId()));
        assertThat(confirmedEvent.getCapacity().getCurrentAttendees()).isZero();
        assertThat(confirmed.getStatus()).isEqualTo(EventRegistrationStatus.CANCELLED);
        verify(registrations).save(confirmed, confirmed.getUserId());
    }

    @Test
    void attendeeCannotCancelAConfirmedOnlinePaymentWithoutTheOrganizer() {
        Event event = event();
        EventRegistration paid = request(event, new BigDecimal("100"));
        event.holdAttendees(1);
        Instant now = Instant.now();
        paid.prepareOnlinePayment(now.plus(1, ChronoUnit.HOURS), now);
        event.confirmHeldAttendees(1);
        paid.confirmVerifiedPayment(now);
        stubCancellation(event, paid);

        assertThatThrownBy(() -> new CancelEventRegistrationCommandHandler(events, registrations)
                .execute(new CancelEventRegistrationCommand(event.getId(), paid.getUserId())))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code").isEqualTo("PAID_REGISTRATION_REQUIRES_ORGANIZER");

        assertThat(paid.getStatus()).isEqualTo(EventRegistrationStatus.CONFIRMED);
        assertThat(paid.getPaymentStatus()).isEqualTo(EventPaymentStatus.APPROVED);
        assertThat(event.getCapacity().getCurrentAttendees()).isEqualTo(1);
        verify(registrations, never()).save(any());
        verify(registrations, never()).save(any(), any());
        verify(events, never()).save(any());
    }

    @Test
    void reportsMissingRegistrationAndEvent() {
        UUID registrationId = UUID.randomUUID();
        when(registrations.findByIdForUpdate(registrationId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> new ConfirmEventAttendanceCommandHandler(events, registrations)
                .execute(new ConfirmEventAttendanceCommand(registrationId, UUID.randomUUID())))
                .isInstanceOf(EntityNotFoundException.class);

        Event event = event();
        EventRegistration registration = request(event, BigDecimal.ZERO);
        when(registrations.findByIdForUpdate(registration.getId()))
                .thenReturn(Optional.of(registration));
        when(events.findByIdForUpdate(event.getId())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> new ConfirmEventAttendanceCommandHandler(events, registrations)
                .execute(new ConfirmEventAttendanceCommand(
                        registration.getId(), registration.getUserId())))
                .isInstanceOf(EntityNotFoundException.class);

        assertThatThrownBy(() -> new ReportEventPaymentCommandHandler(registrations)
                .execute(new ReportEventPaymentCommand(
                        UUID.randomUUID(), UUID.randomUUID(), EventPaymentMethod.TRANSFER)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void protectsCancellationOwnershipEvenWhenRepositoryReturnsAnInvalidAggregate() {
        Event event = event();
        EventRegistration someoneElsesRegistration = request(event, BigDecimal.ZERO);
        UUID requestingUser = UUID.randomUUID();
        when(events.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        when(registrations.findByEventIdAndUserId(event.getId(), requestingUser))
                .thenReturn(Optional.of(someoneElsesRegistration));

        assertThatThrownBy(() -> new CancelEventRegistrationCommandHandler(events, registrations)
                .execute(new CancelEventRegistrationCommand(event.getId(), requestingUser)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code").isEqualTo("REGISTRATION_OWNERSHIP");
    }

    @Test
    void reportsMissingEventAndRegistrationDuringCancellation() {
        UUID eventId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(events.findByIdForUpdate(eventId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> new CancelEventRegistrationCommandHandler(
                events, registrations).execute(
                new CancelEventRegistrationCommand(eventId, userId)))
                .isInstanceOf(EntityNotFoundException.class);

        Event event = event();
        when(events.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        when(registrations.findByEventIdAndUserId(event.getId(), userId))
                .thenReturn(Optional.empty());
        assertThatThrownBy(() -> new CancelEventRegistrationCommandHandler(
                events, registrations).execute(
                new CancelEventRegistrationCommand(event.getId(), userId)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    private void stubCancellation(Event event, EventRegistration registration) {
        when(events.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        when(registrations.findByEventIdAndUserId(event.getId(), registration.getUserId()))
                .thenReturn(Optional.of(registration));
    }

    private Event event() {
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);
        Event event = Event.create("Tasting", EventType.TASTING,
                EventDateRange.of(start, start.plus(2, ChronoUnit.HOURS)), UUID.randomUUID());
        event.updateCapacity(10);
        event.publish();
        return event;
    }

    private EventRegistration request(Event event, BigDecimal amount) {
        return EventRegistration.request(event.getId(), UUID.randomUUID(), 1,
                "Guest", "guest@vinnot.com", null, null, List.of(), "ARS", amount);
    }
}
