package com.vinnot.event.application.command.handler;

import com.vinnot.event.application.command.model.CancelEventCommand;
import com.vinnot.event.application.port.in.CancelEventUseCase;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.service.EventCancellationService;
import com.vinnot.event.domain.model.Event;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

import java.util.Objects;

@Service
@RequiredArgsConstructor
public class CancelEventCommandHandler implements CancelEventUseCase {

    private final EventRepositoryPort eventRepository;
    private final EventCancellationService cancellations;

    @Override
    @Transactional
    public void execute(CancelEventCommand command) {
        Event event = eventRepository.findByIdForUpdate(command.eventId())
                .orElseThrow(() -> new EntityNotFoundException("Event", command.eventId()));

        if (!command.administrator()
                && !Objects.equals(event.getOrganizerId(), command.requestingUserId())) {
            throw new BusinessRuleViolationException(
                    "EVENT_OWNERSHIP",
                    "You can only cancel events that you organize");
        }

        event.cancel();
        cancellations.saveCancelled(event, command.requestingUserId(), command.cancellation());
    }
}
