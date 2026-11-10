package com.vinnot.event.application.port.out;

import com.vinnot.event.domain.model.EventRegistration;
import com.vinnot.event.domain.valueobject.EventRegistrationStatus;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventRegistrationRepositoryPort {

    /** Saves a change no person made directly (payments, expirations, registration itself). */
    EventRegistration save(EventRegistration registration);

    /**
     * Saves a change made by {@code actorId}. The organizer is not notified about changes they made themselves.
     */
    EventRegistration save(EventRegistration registration, UUID actorId);

    Optional<EventRegistration> findById(UUID registrationId);

    Optional<UUID> findEventId(UUID registrationId);

    Optional<EventRegistration> findByIdForUpdate(UUID registrationId);

    Optional<EventRegistration> findByEventIdAndUserId(UUID eventId, UUID userId);

    boolean existsByEventIdAndUserId(UUID eventId, UUID userId);

    PageResult<EventRegistration> findByEvent(
            UUID eventId,
            EventRegistrationStatus status,
            PageQuery pageQuery);

    List<EventRegistration> findExpiredHolds(Instant now, int limit);

    long countConfirmedAttendees(UUID eventId);

    long countRegistrationsByUserId(UUID userId);
}
