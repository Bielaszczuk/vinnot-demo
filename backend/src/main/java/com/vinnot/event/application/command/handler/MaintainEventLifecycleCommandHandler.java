package com.vinnot.event.application.command.handler;

import com.vinnot.event.application.port.in.MaintainEventLifecycleUseCase;
import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.domain.model.EventRegistration;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import com.vinnot.event.application.service.EventHoldExpirationService;

@Service
@RequiredArgsConstructor
public class MaintainEventLifecycleCommandHandler implements MaintainEventLifecycleUseCase {

    private static final int EXPIRATION_BATCH_SIZE = 200;

    private final EventRepositoryPort eventRepository;
    private final EventRegistrationRepositoryPort registrationRepository;
    private final EventHoldExpirationService expirationService;

    @Override
    public void execute(Instant now) {
        Instant executionTime = Objects.requireNonNull(now, "Lifecycle execution time cannot be null");
        eventRepository.completeExpiredEvents(executionTime);

        List<EventRegistration> candidates =
                registrationRepository.findExpiredHolds(executionTime, EXPIRATION_BATCH_SIZE);
        for (EventRegistration candidate : candidates) {
            expirationService.expire(candidate, executionTime);
        }
    }

}
