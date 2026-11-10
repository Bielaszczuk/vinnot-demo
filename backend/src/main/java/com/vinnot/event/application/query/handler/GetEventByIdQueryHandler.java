package com.vinnot.event.application.query.handler;

import com.vinnot.event.application.port.in.GetEventByIdUseCase;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.query.model.GetEventByIdQuery;
import com.vinnot.event.application.query.response.EventDetailsResponse;
import com.vinnot.event.domain.model.Event;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GetEventByIdQueryHandler implements GetEventByIdUseCase {

    private final EventRepositoryPort eventRepository;

    @Override
    @Transactional(readOnly = true)
    public EventDetailsResponse execute(GetEventByIdQuery query) {
        Event event = eventRepository.findById(query.eventId())
                .filter(value -> query.reader().mayRead(value.isPubliclyVisible(), value.getOrganizerId()))
                .orElseThrow(() -> new EntityNotFoundException("Event", query.eventId()));

        return EventDetailsResponse.fromDomain(event);
    }
}
