package com.vinnot.event.application.service;

import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.domain.model.EventRegistration;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;

/** One short transaction per hold. All writers acquire event before registration. */
@Service
@RequiredArgsConstructor
public class EventHoldExpirationService {
    private final EventRepositoryPort events;
    private final EventRegistrationRepositoryPort registrations;

    @Transactional
    public void expire(EventRegistration candidate, Instant now) {
        var event = events.findByIdForUpdate(candidate.getEventId());
        var current = registrations.findByIdForUpdate(candidate.getId());
        if (current.isEmpty() || !current.get().isExpiredHoldAt(now)) {
            return;
        }
        EventRegistration registration = current.get();
        event.ifPresent(value -> {
            value.releaseHeldAttendees(registration.getAttendeeCount());
            events.save(value);
        });
        registration.expire(now);
        registrations.save(registration);
    }
}
