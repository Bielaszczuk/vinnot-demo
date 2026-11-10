package com.vinnot.event.infrastructure.persistence.adapter;

import com.vinnot.event.application.port.out.EventRegistrationPointsPort;
import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.event.domain.model.EventRegistration;
import com.vinnot.event.domain.valueobject.EventRegistrationStatus;
import com.vinnot.event.infrastructure.persistence.entity.EventRegistrationJpaEntity;
import com.vinnot.event.infrastructure.persistence.jpa.EventRegistrationJpaRepository;
import com.vinnot.event.infrastructure.persistence.mapper.EventRegistrationPersistenceMapper;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.infrastructure.persistence.PageMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class EventRegistrationPersistenceAdapter implements EventRegistrationRepositoryPort {

    private static final List<EventRegistrationJpaEntity.RegistrationStatusEnum> HOLD_STATUSES = List.of(
            EventRegistrationJpaEntity.RegistrationStatusEnum.AWAITING_PAYMENT,
            EventRegistrationJpaEntity.RegistrationStatusEnum.AWAITING_ATTENDEE_CONFIRMATION);
    private static final List<EventRegistrationJpaEntity.RegistrationStatusEnum> ACTIVE_STATUSES = List.of(
            EventRegistrationJpaEntity.RegistrationStatusEnum.REQUESTED,
            EventRegistrationJpaEntity.RegistrationStatusEnum.AWAITING_PAYMENT,
            EventRegistrationJpaEntity.RegistrationStatusEnum.AWAITING_ATTENDEE_CONFIRMATION,
            EventRegistrationJpaEntity.RegistrationStatusEnum.CONFIRMED,
            EventRegistrationJpaEntity.RegistrationStatusEnum.WAITLISTED);
    /** Organizers review requests in arrival order; the id keeps ties stable across updates. */
    private static final Sort OLDEST_REQUEST_FIRST = Sort.by(
            Sort.Order.asc("createdAt"), Sort.Order.asc("id"));

    private final EventRegistrationJpaRepository repository;
    private final EventRegistrationPointsPort points;

    @Override
    public EventRegistration save(EventRegistration registration) {
        return save(registration, null);
    }

    @Override
    public EventRegistration save(EventRegistration registration, UUID actorId) {
        EventRegistrationJpaEntity entity = EventRegistrationPersistenceMapper.toEntity(registration);
        entity.setLastActorId(actorId);
        EventRegistration saved = EventRegistrationPersistenceMapper.toDomain(repository.save(entity));
        reward(saved);
        return saved;
    }

    /**
     * Every registration change of the event and payment modules is saved here, so this is the one place where a
     * confirmation earns its points and a cancellation, rejection or expiry takes them back (#455).
     */
    private void reward(EventRegistration registration) {
        if (registration.getStatus() == EventRegistrationStatus.CONFIRMED) {
            points.registrationConfirmed(registration.getUserId(), registration.getId(), registration.getEventId());
        } else if (registration.getStatus().isTerminal()) {
            points.registrationEnded(registration.getUserId(), registration.getId());
        }
    }

    @Override
    public Optional<EventRegistration> findById(UUID registrationId) {
        return repository.findById(registrationId)
                .map(EventRegistrationPersistenceMapper::toDomain);
    }

    @Override
    public Optional<UUID> findEventId(UUID registrationId) {
        return repository.findEventId(registrationId);
    }

    @Override
    public Optional<EventRegistration> findByIdForUpdate(UUID registrationId) {
        return repository.findByIdForUpdate(registrationId)
                .map(EventRegistrationPersistenceMapper::toDomain);
    }

    @Override
    public Optional<EventRegistration> findByEventIdAndUserId(UUID eventId, UUID userId) {
        return repository.findFirstByEventIdAndUserIdOrderByCreatedAtDesc(eventId, userId)
                .map(EventRegistrationPersistenceMapper::toDomain);
    }

    @Override
    public boolean existsByEventIdAndUserId(UUID eventId, UUID userId) {
        return repository.existsActiveByEventIdAndUserId(eventId, userId, ACTIVE_STATUSES);
    }

    @Override
    public PageResult<EventRegistration> findByEvent(
            UUID eventId,
            EventRegistrationStatus status,
            PageQuery pageQuery) {
        Pageable oldestRequestFirst = PageRequest.of(
                pageQuery.page(), pageQuery.size(), OLDEST_REQUEST_FIRST);
        if (Objects.isNull(status)) {
            return PageMapper.toPageResult(
                    repository.findByEventId(eventId, oldestRequestFirst)
                            .map(EventRegistrationPersistenceMapper::toDomain));
        }
        return PageMapper.toPageResult(
                repository.findByEventIdAndStatus(
                                eventId,
                                EventRegistrationJpaEntity.RegistrationStatusEnum.valueOf(status.name()),
                                oldestRequestFirst)
                        .map(EventRegistrationPersistenceMapper::toDomain));
    }

    @Override
    public List<EventRegistration> findExpiredHolds(Instant now, int limit) {
        return repository.findExpiredHolds(HOLD_STATUSES, now, PageRequest.of(0, limit))
                .stream()
                .map(EventRegistrationPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public long countConfirmedAttendees(UUID eventId) {
        return repository.countAttendeesByEventAndStatus(
                eventId,
                EventRegistrationJpaEntity.RegistrationStatusEnum.CONFIRMED);
    }

    @Override
    public long countRegistrationsByUserId(UUID userId) {
        return repository.countByUserId(userId);
    }
}
