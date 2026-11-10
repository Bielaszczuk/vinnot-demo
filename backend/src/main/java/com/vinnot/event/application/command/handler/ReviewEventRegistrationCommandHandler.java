package com.vinnot.event.application.command.handler;

import com.vinnot.event.application.command.model.ReviewEventRegistrationCommand;
import com.vinnot.event.application.port.in.ReviewEventRegistrationUseCase;
import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.query.response.EventRegistrationResponse;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.model.EventRegistration;
import com.vinnot.event.domain.valueobject.EventRegistrationSettings;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ReviewEventRegistrationCommandHandler
        implements ReviewEventRegistrationUseCase {

    private final EventRepositoryPort eventRepository;
    private final EventRegistrationRepositoryPort registrationRepository;

    @Override
    @Transactional
    @SuppressWarnings("checkstyle:MissingSwitchDefault")
    public EventRegistrationResponse execute(ReviewEventRegistrationCommand command) {
        Event event = eventRepository.findByIdForUpdate(command.eventId())
                .orElseThrow(() -> new EntityNotFoundException("Event", command.eventId()));
        assertOrganizer(event, command);

        EventRegistration registration = registrationRepository
                .findByIdForUpdate(command.registrationId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "EventRegistration", command.registrationId()));
        if (!Objects.equals(registration.getEventId(), event.getId())) {
            throw new BusinessRuleViolationException(
                    "REGISTRATION_EVENT_MISMATCH",
                    "The registration does not belong to this event");
        }

        switch (command.action()) {
            case APPROVE -> approve(event, registration, command.organizerNote());
            case REJECT -> reject(event, registration, command.organizerNote());
            case WAITLIST -> waitlist(event, registration, command.organizerNote());
            case APPROVE_PAYMENT, CONFIRM_PAY_AT_VENUE -> throw new BusinessRuleViolationException(
                    "PAYMENT_PROVIDER_VERIFICATION_REQUIRED",
                    "El pago se confirma automáticamente al verificarlo con Mercado Pago.");
        }

        eventRepository.save(event);
        return EventRegistrationResponse.fromDomain(
                registrationRepository.save(registration, command.requestingUserId()));
    }

    private void approve(Event event, EventRegistration registration, String organizerNote) {
        if (!event.hasAvailableCapacity(registration.getAttendeeCount())) {
            registration.waitlist(organizerNote);
            return;
        }

        EventRegistrationSettings settings = event.getRegistrationSettings();
        boolean paid = Objects.nonNull(registration.getTotalAmount())
                && registration.getTotalAmount().signum() > 0;
        if (paid) {
            event.holdAttendees(registration.getAttendeeCount());
            registration.approvePaid(
                    settings.holdUntil(Instant.now(), event.getDateRange().getStartDate()),
                    organizerNote);
            registration.requireProviderVerification();
            return;
        }
        if (settings.isAttendeeConfirmationRequired()) {
            event.holdAttendees(registration.getAttendeeCount());
        } else {
            event.confirmAttendees(registration.getAttendeeCount());
        }
        registration.approveFree(
                settings.holdUntil(Instant.now(), event.getDateRange().getStartDate()),
                settings.isAttendeeConfirmationRequired(),
                organizerNote);
    }

    private void reject(Event event, EventRegistration registration, String reason) {
        releaseCapacity(event, registration);
        registration.reject(reason);
    }

    private void waitlist(Event event, EventRegistration registration, String reason) {
        releaseCapacity(event, registration);
        registration.waitlist(reason);
    }

    private void releaseCapacity(Event event, EventRegistration registration) {
        if (registration.holdsCapacity()) {
            event.releaseHeldAttendees(registration.getAttendeeCount());
        }
    }

    private void assertOrganizer(
            Event event,
            ReviewEventRegistrationCommand command) {
        if (!command.isAdmin()
                && !Objects.equals(event.getOrganizerId(), command.requestingUserId())) {
            throw new BusinessRuleViolationException(
                    "EVENT_OWNERSHIP",
                    "Only the event organizer can review registrations");
        }
    }
}
