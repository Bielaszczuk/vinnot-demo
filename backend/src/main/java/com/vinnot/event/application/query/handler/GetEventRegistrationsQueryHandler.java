package com.vinnot.event.application.query.handler;

import com.vinnot.event.application.port.in.GetEventRegistrationsUseCase;
import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.query.model.GetEventRegistrationsQuery;
import com.vinnot.event.application.query.response.EventRegistrationResponse;
import com.vinnot.event.domain.model.Event;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
public class GetEventRegistrationsQueryHandler
        implements GetEventRegistrationsUseCase {

    private final EventRepositoryPort eventRepository;
    private final EventRegistrationRepositoryPort registrationRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResult<EventRegistrationResponse> execute(
            GetEventRegistrationsQuery query) {
        Event event = eventRepository.findById(query.eventId())
                .orElseThrow(() -> new EntityNotFoundException("Event", query.eventId()));
        if (!query.isAdmin()
                && !Objects.equals(event.getOrganizerId(), query.requestingUserId())) {
            throw new BusinessRuleViolationException(
                    "EVENT_OWNERSHIP",
                    "Only the event organizer can view registrations");
        }
        return registrationRepository.findByEvent(
                        query.eventId(),
                        query.status(),
                        PageQuery.of(query.page(), query.size()))
                .map(EventRegistrationResponse::fromDomain);
    }
}
