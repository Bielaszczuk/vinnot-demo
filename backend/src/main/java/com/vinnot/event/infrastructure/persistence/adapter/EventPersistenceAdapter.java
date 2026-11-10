package com.vinnot.event.infrastructure.persistence.adapter;

import com.vinnot.event.application.port.out.EventRegistrationPointsPort;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.infrastructure.persistence.entity.EventJpaEntity;
import com.vinnot.event.infrastructure.persistence.entity.EventRegistrationJpaEntity;
import com.vinnot.event.infrastructure.persistence.jpa.EventJpaRepository;
import com.vinnot.event.infrastructure.persistence.jpa.EventRegistrationJpaRepository;
import com.vinnot.event.infrastructure.persistence.mapper.EventPersistenceMapper;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.infrastructure.persistence.PageMapper;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import com.vinnot.event.domain.valueobject.EventStatus;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class EventPersistenceAdapter implements EventRepositoryPort {

    private static final List<EventJpaEntity.EventStatusEnum> PUBLIC_STATUSES = List.of(
            EventJpaEntity.EventStatusEnum.PUBLISHED,
            EventJpaEntity.EventStatusEnum.SOLD_OUT);

    private static final Comparator<EventRegistrationJpaEntity> BY_ATTENDEE = Comparator
            .comparing((EventRegistrationJpaEntity registration) -> registration.getUserId().toString())
            .thenComparing(registration -> registration.getId().toString());

    private final EventJpaRepository jpaRepository;
    private final EventRegistrationJpaRepository registrationJpaRepository;
    private final EventRegistrationPointsPort points;

    @Override
    public Optional<Event> findById(UUID id) {
        return jpaRepository.findById(id)
                .map(EventPersistenceMapper::toDomain);
    }

    @Override
    public Optional<Event> findByIdForUpdate(UUID id) {
        return jpaRepository.findByIdForUpdate(id)
                .map(EventPersistenceMapper::toDomain);
    }

    @Override
    public PageResult<Event> findAll(PageQuery pageQuery) {
        return PageMapper.toPageResult(
                jpaRepository.findAll(PageMapper.toPageable(pageQuery))
                        .map(EventPersistenceMapper::toDomain));
    }

    @Override
    public PageResult<Event> findPublished(PageQuery pageQuery) {
        return PageMapper.toPageResult(
                jpaRepository.findPublic(PUBLIC_STATUSES, Instant.now(), PageMapper.toPageable(pageQuery))
                        .map(EventPersistenceMapper::toDomain));
    }

    @Override
    public PageResult<Event> findUpcoming(PageQuery pageQuery) {
        return PageMapper.toPageResult(
                jpaRepository.findUpcoming(PUBLIC_STATUSES, Instant.now(), PageMapper.toPageable(pageQuery))
                        .map(EventPersistenceMapper::toDomain));
    }

    @Override
    public PageResult<Event> search(
            String searchTerm,
            String eventType,
            String city,
            String region,
            String country,
            PageQuery pageQuery) {
        EventJpaEntity.EventTypeEnum typeEnum = null;
        if (Objects.nonNull(eventType) && !eventType.isBlank()) {
            typeEnum = EventJpaEntity.EventTypeEnum.valueOf(eventType.toUpperCase());
        }

        return PageMapper.toPageResult(
                jpaRepository.search(
                                searchTerm,
                                typeEnum,
                                city,
                                region,
                                country,
                                PUBLIC_STATUSES,
                                Instant.now(),
                                PageMapper.toPageable(pageQuery))
                        .map(EventPersistenceMapper::toDomain));
    }

    @Override
    public List<Event> findNearby(double latitude, double longitude, double radiusKm, int limit) {
        return jpaRepository.findNearby(
                latitude,
                longitude,
                PUBLIC_STATUSES,
                Instant.now(),
                PageRequest.of(0, limit)
        ).stream()
                .map(EventPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public List<Event> findDiscoveryCandidates(int limit) {
        return jpaRepository.findDiscoveryCandidates(
                        PUBLIC_STATUSES,
                        Instant.now(),
                        PageRequest.of(0, limit))
                .stream()
                .map(EventPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public PageResult<Event> findByOrganizer(UUID organizerId, PageQuery pageQuery) {
        return PageMapper.toPageResult(
                jpaRepository.findByOrganizerId(organizerId, PageMapper.toPageable(pageQuery))
                        .map(EventPersistenceMapper::toDomain));
    }

    @Override
    public PageResult<Event> searchByOrganizer(UUID organizerId, String searchTerm, PageQuery pageQuery) {
        return PageMapper.toPageResult(
                jpaRepository.searchByOrganizerId(organizerId, searchTerm, PageMapper.toPageable(pageQuery))
                        .map(EventPersistenceMapper::toDomain));
    }

    @Override
    public Event save(Event event) {
        EventJpaEntity entity = EventPersistenceMapper.toEntity(event);
        EventJpaEntity saved = jpaRepository.save(entity);
        if (event.getStatus() == EventStatus.CANCELLED) {
            cancelRegistrations(event.getId(), null);
        }
        return EventPersistenceMapper.toDomain(saved);
    }

    @Override
    public int saveCancellation(Event event, UUID actorId) {
        if (event.getStatus() != EventStatus.CANCELLED) {
            throw new IllegalStateException("Only a cancelled event can cancel its registrations");
        }
        jpaRepository.save(EventPersistenceMapper.toEntity(event));
        // Flushes the event first, so the registration trigger sees it cancelled.
        return cancelRegistrations(event.getId(), actorId);
    }

    /**
     * Cancels every active registration in one statement and takes back the points of the confirmed ones (#455).
     * Attendees are handled in user id order (the text order matches PostgreSQL's uuid order), so two cancellations
     * that share attendees lock their points rows in the same order and never deadlock.
     */
    private int cancelRegistrations(UUID eventId, UUID actorId) {
        List<EventRegistrationJpaEntity> confirmed = registrationJpaRepository.findAllByEventIdAndStatus(
                eventId, EventRegistrationJpaEntity.RegistrationStatusEnum.CONFIRMED);
        int cancelled = registrationJpaRepository.cancelActiveForEvent(eventId, actorId);
        confirmed.stream()
                .sorted(BY_ATTENDEE)
                .forEach(registration -> points.registrationEnded(registration.getUserId(), registration.getId()));
        return cancelled;
    }

    @Override
    public void delete(Event event) {
        jpaRepository.deleteById(event.getId());
    }

    @Override
    public boolean existsById(UUID id) {
        return jpaRepository.existsById(id);
    }

    @Override
    public long count() {
        return jpaRepository.count();
    }

    @Override
    public long countPublished() {
        return jpaRepository.countByStatusInAndEndDateAfter(PUBLIC_STATUSES, Instant.now());
    }

    @Override
    public PageResult<Event> searchAll(String searchTerm, String eventType, String city, PageQuery pageQuery) {
        EventJpaEntity.EventTypeEnum typeEnum = null;
        if (Objects.nonNull(eventType) && !eventType.isBlank()) {
            typeEnum = EventJpaEntity.EventTypeEnum.valueOf(eventType.toUpperCase());
        }
        return PageMapper.toPageResult(
                jpaRepository.searchAll(searchTerm, typeEnum, city,
                                PageRequest.of(pageQuery.page(), pageQuery.size(),
                                        Sort.by(Sort.Direction.DESC, "createdAt")))
                        .map(EventPersistenceMapper::toDomain));
    }

    @Override
    public long countRegistrationsByUserId(UUID userId) {
        return registrationJpaRepository.countByUserId(userId);
    }

    @Override
    @Transactional
    public int completeExpiredEvents(Instant now) {
        return jpaRepository.completeExpiredEvents(
                PUBLIC_STATUSES,
                EventJpaEntity.EventStatusEnum.COMPLETED,
                now);
    }
}
