package com.vinnot.event.application.command.handler;

import com.vinnot.event.application.command.model.PublishEventCommand;
import com.vinnot.event.application.port.in.PublishEventUseCase;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.domain.model.Event;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

import java.util.Objects;
import com.vinnot.event.application.service.AnnounceNewEventNearbyService;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class PublishEventCommandHandler implements PublishEventUseCase {

    private final EventRepositoryPort eventRepository;
    private final AnnounceNewEventNearbyService newEventsNearby;

    @Override
    @Transactional
    public void execute(PublishEventCommand command) {
        Event event = eventRepository.findByIdForUpdate(command.eventId())
                .orElseThrow(() -> new EntityNotFoundException("Event", command.eventId()));

        if (!command.administrator()
                && !Objects.equals(event.getOrganizerId(), command.requestingUserId())) {
            throw new BusinessRuleViolationException(
                    "EVENT_OWNERSHIP",
                    "You can only publish events that you organize");
        }

        boolean publishedBefore = event.isPublishedOnce();
        event.publish();
        eventRepository.save(event);
        newEventsNearby.announce(event, publishedBefore, Instant.now());
    }
}
