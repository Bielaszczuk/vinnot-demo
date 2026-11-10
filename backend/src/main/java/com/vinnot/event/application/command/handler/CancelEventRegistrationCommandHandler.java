package com.vinnot.event.application.command.handler;

import com.vinnot.event.application.command.model.CancelEventRegistrationCommand;
import com.vinnot.event.application.port.in.CancelEventRegistrationUseCase;
import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.model.EventRegistration;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CancelEventRegistrationCommandHandler implements CancelEventRegistrationUseCase {

    private final EventRepositoryPort eventRepository;
    private final EventRegistrationRepositoryPort registrationRepository;

    @Override
    @Transactional
    public void execute(CancelEventRegistrationCommand command) {
        Event event = eventRepository.findByIdForUpdate(command.eventId())
                .orElseThrow(() -> new EntityNotFoundException("Event", command.eventId()));
        EventRegistration registration = registrationRepository
                .findByEventIdAndUserId(command.eventId(), command.userId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "EventRegistration", command.eventId()));

        if (!Objects.equals(registration.getUserId(), command.userId())) {
            throw new BusinessRuleViolationException(
                    "REGISTRATION_OWNERSHIP",
                    "You can only cancel your own registration");
        }
        registration.requireCancellableByAttendee();
        if (registration.holdsCapacity()) {
            event.releaseHeldAttendees(registration.getAttendeeCount());
        } else if (registration.isConfirmed()) {
            event.releaseConfirmedAttendees(registration.getAttendeeCount());
        }
        registration.cancel();
        registrationRepository.save(registration, command.userId());
        eventRepository.save(event);
    }
}
