package com.vinnot.event.application.query.handler;

import com.vinnot.event.application.port.in.GetMyEventRegistrationUseCase;
import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.event.application.query.model.GetMyEventRegistrationQuery;
import com.vinnot.event.application.query.response.EventRegistrationResponse;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GetMyEventRegistrationQueryHandler
        implements GetMyEventRegistrationUseCase {

    private final EventRegistrationRepositoryPort registrationRepository;

    @Override
    @Transactional(readOnly = true)
    public EventRegistrationResponse execute(GetMyEventRegistrationQuery query) {
        return registrationRepository
                .findByEventIdAndUserId(query.eventId(), query.userId())
                .map(EventRegistrationResponse::fromDomain)
                .orElseThrow(() -> new EntityNotFoundException(
                        "EventRegistration", query.eventId()));
    }
}
