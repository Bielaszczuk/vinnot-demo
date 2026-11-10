package com.vinnot.event.application.command.handler;

import com.vinnot.event.application.command.model.ReviewEventRegistrationCommand;
import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.model.EventRegistration;
import com.vinnot.event.domain.valueobject.EventDateRange;
import com.vinnot.event.domain.valueobject.EventPaymentMethod;
import com.vinnot.event.domain.valueobject.EventRegistrationAction;
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
import com.vinnot.event.domain.valueobject.EventApprovalMode;
import com.vinnot.event.domain.valueobject.EventRegistrationSettings;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ReviewEventRegistrationCommandHandlerTest {

    private EventRepositoryPort eventRepository;
    private EventRegistrationRepositoryPort registrationRepository;

    @BeforeEach
    void setUp() {
        eventRepository = mock(EventRepositoryPort.class);
        registrationRepository = mock(EventRegistrationRepositoryPort.class);
        when(registrationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(registrationRepository.save(any(), any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void approvesPaidFreeAndUnavailableRequests() {
        Event paidEvent = event(5);
        EventRegistration paid = registration(paidEvent, new BigDecimal("100"));
        execute(paidEvent, paid, EventRegistrationAction.APPROVE, null, null);
        assertThat(paid.getStatus()).isEqualTo(EventRegistrationStatus.AWAITING_PAYMENT);
        assertThat(paidEvent.getCapacity().getHeldAttendees()).isEqualTo(1);

        Event freeEvent = event(5);
        freeEvent.updateRegistrationSettings(EventRegistrationSettings.of(
                "ARS", null, 6,
                EventApprovalMode.MANUAL,
                false, 60, null, null, null));
        EventRegistration free = registration(freeEvent, BigDecimal.ZERO);
        execute(freeEvent, free, EventRegistrationAction.APPROVE, null, null);
        assertThat(free.getStatus()).isEqualTo(EventRegistrationStatus.CONFIRMED);

        Event confirmationEvent = event(5);
        EventRegistration confirmation = registration(confirmationEvent, BigDecimal.ZERO);
        execute(confirmationEvent, confirmation, EventRegistrationAction.APPROVE, null, null);
        assertThat(confirmation.getStatus())
                .isEqualTo(EventRegistrationStatus.AWAITING_ATTENDEE_CONFIRMATION);
        assertThat(confirmationEvent.getCapacity().getHeldAttendees()).isEqualTo(1);

        Event fullEvent = event(1);
        fullEvent.confirmAttendees(1);
        EventRegistration full = registration(fullEvent, BigDecimal.ZERO);
        execute(fullEvent, full, EventRegistrationAction.APPROVE, null, null);
        assertThat(full.getStatus()).isEqualTo(EventRegistrationStatus.WAITLISTED);
    }

    @Test
    void rejectsRequestedAndHeldRegistrationsReleasingCapacity() {
        Event rejectedEvent = event(5);
        EventRegistration rejected = registration(rejectedEvent, BigDecimal.ZERO);
        execute(rejectedEvent, rejected, EventRegistrationAction.REJECT, null, "invalid");
        assertThat(rejected.getStatus()).isEqualTo(EventRegistrationStatus.REJECTED);

        Event heldEvent = event(5);
        EventRegistration held = registration(heldEvent, new BigDecimal("100"));
        heldEvent.holdAttendees(1);
        held.approvePaid(Instant.now().plus(1, ChronoUnit.HOURS));
        execute(heldEvent, held, EventRegistrationAction.REJECT, null, "capacity");
        assertThat(held.getStatus()).isEqualTo(EventRegistrationStatus.REJECTED);
        assertThat(heldEvent.getCapacity().getHeldAttendees()).isZero();

        Event waitlistedEvent = event(5);
        EventRegistration waitlisted = registration(waitlistedEvent, BigDecimal.ZERO);
        execute(waitlistedEvent, waitlisted, EventRegistrationAction.WAITLIST, null, "later");
        assertThat(waitlisted.getStatus()).isEqualTo(EventRegistrationStatus.WAITLISTED);
    }

    @Test
    void rejectsAllManualPaymentActionsWithoutChangingCapacityEvenForLegacyReservations() {
        for (var action : List.of(EventRegistrationAction.APPROVE_PAYMENT, EventRegistrationAction.CONFIRM_PAY_AT_VENUE)) {
            for (boolean held : List.of(false, true)) {
                Event event = event(5);
                EventRegistration registration = registration(event, new BigDecimal("100"));
                if (held) {
                    event.holdAttendees(1);
                    registration.approvePaid(Instant.now().plus(1, ChronoUnit.HOURS));
                }
                var previous = registration.getStatus();
                assertThatThrownBy(() -> execute(event, registration, action, EventPaymentMethod.TRANSFER, null))
                        .isInstanceOf(BusinessRuleViolationException.class)
                        .extracting("code").isEqualTo("PAYMENT_PROVIDER_VERIFICATION_REQUIRED");
                assertThat(registration.getStatus()).isEqualTo(previous);
                assertThat(event.getCapacity().getCurrentAttendees()).isZero();
                assertThat(event.getCapacity().getHeldAttendees()).isEqualTo(held ? 1 : 0);
            }
        }
    }

    @Test
    void enforcesOwnershipAndEventIdentity() {
        Event event = event(5);
        EventRegistration registration = registration(event, BigDecimal.ZERO);
        when(eventRepository.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        ReviewEventRegistrationCommand unauthorized = new ReviewEventRegistrationCommand(
                event.getId(), registration.getId(), UUID.randomUUID(), false,
                EventRegistrationAction.APPROVE, null, null);
        assertThatThrownBy(() -> handler().execute(unauthorized))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code").isEqualTo("EVENT_OWNERSHIP");

        Event other = event(5);
        when(eventRepository.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        when(registrationRepository.findByIdForUpdate(registration.getId()))
                .thenReturn(Optional.of(registration(other, BigDecimal.ZERO)));
        ReviewEventRegistrationCommand mismatch = new ReviewEventRegistrationCommand(
                event.getId(), registration.getId(), null, true,
                EventRegistrationAction.APPROVE, null, null);
        assertThatThrownBy(() -> handler().execute(mismatch))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code").isEqualTo("REGISTRATION_EVENT_MISMATCH");
    }

    @Test
    void rechecksCapacityWhenPromotingWaitlistedRequests() {
        Event full = event(1);
        full.confirmAttendees(1);
        EventRegistration waiting = registration(full, BigDecimal.ZERO);
        waiting.waitlist("Full");
        execute(full, waiting, EventRegistrationAction.APPROVE, null, null);
        assertThat(waiting.getStatus()).isEqualTo(EventRegistrationStatus.WAITLISTED);
        assertThat(full.getCapacity().getHeldAttendees()).isZero();

        Event available = event(1);
        EventRegistration promoted = registration(available, BigDecimal.ZERO);
        promoted.waitlist("Previously full");
        execute(available, promoted, EventRegistrationAction.APPROVE, null, null);
        assertThat(promoted.getStatus()).isEqualTo(EventRegistrationStatus.AWAITING_ATTENDEE_CONFIRMATION);
        assertThat(available.getCapacity().getHeldAttendees()).isEqualTo(1);
    }

    @Test
    void approvalKeepsTheOrganizerNoteForFreeAndPaidRequests() {
        Event freeEvent = event(5);
        EventRegistration free = registration(freeEvent, BigDecimal.ZERO);
        execute(freeEvent, free, EventRegistrationAction.APPROVE, null, "Te esperamos a las 19");
        assertThat(free.getStatus()).isEqualTo(EventRegistrationStatus.AWAITING_ATTENDEE_CONFIRMATION);
        assertThat(free.getOrganizerNote()).isEqualTo("Te esperamos a las 19");

        Event paidEvent = event(5);
        EventRegistration paid = registration(paidEvent, new BigDecimal("100"));
        execute(paidEvent, paid, EventRegistrationAction.APPROVE, null, "Traé tu copa");
        assertThat(paid.getStatus()).isEqualTo(EventRegistrationStatus.AWAITING_PAYMENT);
        assertThat(paid.getOrganizerNote()).isEqualTo("Traé tu copa");
    }

    @Test
    void capacityFallbackStoresOnlyTheOrganizerNoteNeverAnEnglishSentence() {
        Event withNote = event(1);
        withNote.confirmAttendees(1);
        EventRegistration noted = registration(withNote, BigDecimal.ZERO);
        execute(withNote, noted, EventRegistrationAction.APPROVE, null, "Te avisamos si se libera");
        assertThat(noted.getStatus()).isEqualTo(EventRegistrationStatus.WAITLISTED);
        assertThat(noted.getOrganizerNote()).isEqualTo("Te avisamos si se libera");

        Event withoutNote = event(1);
        withoutNote.confirmAttendees(1);
        EventRegistration silent = registration(withoutNote, BigDecimal.ZERO);
        execute(withoutNote, silent, EventRegistrationAction.APPROVE, null, null);
        assertThat(silent.getStatus()).isEqualTo(EventRegistrationStatus.WAITLISTED);
        assertThat(silent.getOrganizerNote()).isNull();
    }

    @Test
    void rejectAndWaitlistStillStoreTheirNotes() {
        Event rejectedEvent = event(5);
        EventRegistration rejected = registration(rejectedEvent, BigDecimal.ZERO);
        execute(rejectedEvent, rejected, EventRegistrationAction.REJECT, null, "invalid");
        assertThat(rejected.getOrganizerNote()).isEqualTo("invalid");

        Event waitlistedEvent = event(5);
        EventRegistration waitlisted = registration(waitlistedEvent, BigDecimal.ZERO);
        execute(waitlistedEvent, waitlisted, EventRegistrationAction.WAITLIST, null, "later");
        assertThat(waitlisted.getOrganizerNote()).isEqualTo("later");
    }

    @Test
    void reportsMissingRegistration() {
        Event event = event(5);
        UUID registrationId = UUID.randomUUID();
        when(eventRepository.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        when(registrationRepository.findByIdForUpdate(registrationId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> handler().execute(new ReviewEventRegistrationCommand(
                event.getId(), registrationId, null, true,
                EventRegistrationAction.APPROVE, null, null)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    private void execute(
            Event event, EventRegistration registration, EventRegistrationAction action,
            EventPaymentMethod paymentMethod, String note) {
        when(eventRepository.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        when(registrationRepository.findByIdForUpdate(registration.getId()))
                .thenReturn(Optional.of(registration));
        handler().execute(new ReviewEventRegistrationCommand(
                event.getId(), registration.getId(), null, true, action, paymentMethod, note));
    }

    private ReviewEventRegistrationCommandHandler handler() {
        return new ReviewEventRegistrationCommandHandler(eventRepository, registrationRepository);
    }

    private Event event(int capacity) {
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);
        Event event = Event.create("Tasting", EventType.TASTING,
                EventDateRange.of(start, start.plus(2, ChronoUnit.HOURS)), UUID.randomUUID());
        event.updateCapacity(capacity);
        event.publish();
        return event;
    }

    private EventRegistration registration(Event event, BigDecimal amount) {
        return EventRegistration.request(event.getId(), UUID.randomUUID(), 1,
                "Guest", "guest@vinnot.com", null, null, List.of(), "ARS", amount);
    }
}
