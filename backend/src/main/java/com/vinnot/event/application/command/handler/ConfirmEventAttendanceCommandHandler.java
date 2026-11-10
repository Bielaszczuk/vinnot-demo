package com.vinnot.event.application.command.handler;

import com.vinnot.event.application.command.model.ConfirmEventAttendanceCommand;
import com.vinnot.event.application.port.in.ConfirmEventAttendanceUseCase;
import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.query.response.EventRegistrationResponse;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.model.EventRegistration;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ConfirmEventAttendanceCommandHandler
        implements ConfirmEventAttendanceUseCase {

    private final EventRepositoryPort eventRepository;
    private final EventRegistrationRepositoryPort registrationRepository;

    @Override
    @Transactional
    public EventRegistrationResponse execute(ConfirmEventAttendanceCommand command) {
        UUID eventId = registrationRepository.findEventId(command.registrationId())
                .orElseThrow(() -> new EntityNotFoundException("EventRegistration", command.registrationId()));
        Event event = eventRepository.findByIdForUpdate(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event", eventId));
        EventRegistration registration = registrationRepository.findByIdForUpdate(command.registrationId())
                .orElseThrow(() -> new EntityNotFoundException("EventRegistration", command.registrationId()));
        assertOwner(registration, command.userId());
        event.confirmHeldAttendees(registration.getAttendeeCount());
        registration.confirmAttendance();

        eventRepository.save(event);
        return EventRegistrationResponse.fromDomain(
                registrationRepository.save(registration));
    }

    private void assertOwner(EventRegistration registration, UUID userId) {
        if (!Objects.equals(registration.getUserId(), userId)) {
            throw new BusinessRuleViolationException(
                    "REGISTRATION_OWNERSHIP",
                    "You can only confirm your own registration");
        }
    }
}
