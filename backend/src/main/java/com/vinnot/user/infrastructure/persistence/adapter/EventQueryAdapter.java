package com.vinnot.user.infrastructure.persistence.adapter;

import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.user.application.port.out.EventQueryPort;
import org.springframework.stereotype.Component;

import java.util.UUID;
import lombok.RequiredArgsConstructor;

@Component("userEventQueryAdapter")
@RequiredArgsConstructor
public class EventQueryAdapter implements EventQueryPort {

    private final EventRepositoryPort eventRepositoryPort;

    @Override
    public long countRegistrationsByUserId(UUID userId) {
        return eventRepositoryPort.countRegistrationsByUserId(userId);
    }
}

