package com.vinnot.event.infrastructure.persistence.jpa;

import com.vinnot.event.infrastructure.persistence.entity.EventRegistrationJpaEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;

@Repository
public interface EventRegistrationJpaRepository
        extends JpaRepository<EventRegistrationJpaEntity, UUID> {

    @Query("SELECT r.eventId FROM EventRegistrationJpaEntity r WHERE r.id = :id")
    Optional<UUID> findEventId(UUID id);

    @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END "
            + "FROM EventRegistrationJpaEntity r "
            + "WHERE r.eventId = :eventId AND r.userId = :userId "
            + "AND r.status IN :statuses")
    boolean existsActiveByEventIdAndUserId(
            @Param("eventId") UUID eventId,
            @Param("userId") UUID userId,
            @Param("statuses") List<EventRegistrationJpaEntity.RegistrationStatusEnum> statuses);

    Optional<EventRegistrationJpaEntity> findFirstByEventIdAndUserIdOrderByCreatedAtDesc(
            UUID eventId,
            UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM EventRegistrationJpaEntity r WHERE r.id = :id")
    Optional<EventRegistrationJpaEntity> findByIdForUpdate(@Param("id") UUID id);

    Page<EventRegistrationJpaEntity> findByEventId(UUID eventId, Pageable pageable);

    Page<EventRegistrationJpaEntity> findByEventIdAndStatus(
            UUID eventId,
            EventRegistrationJpaEntity.RegistrationStatusEnum status,
            Pageable pageable);

    @Query("SELECT r FROM EventRegistrationJpaEntity r "
            + "WHERE r.status IN :statuses AND r.expiresAt <= :now "
            + "ORDER BY r.expiresAt ASC")
    List<EventRegistrationJpaEntity> findExpiredHolds(
            @Param("statuses") List<EventRegistrationJpaEntity.RegistrationStatusEnum> statuses,
            @Param("now") Instant now,
            Pageable pageable);

    @Query("SELECT COALESCE(SUM(r.attendeeCount), 0) FROM EventRegistrationJpaEntity r "
            + "WHERE r.eventId = :eventId AND r.status = :status")
    long countAttendeesByEventAndStatus(
            @Param("eventId") UUID eventId,
            @Param("status") EventRegistrationJpaEntity.RegistrationStatusEnum status);

    @Modifying(flushAutomatically = true)
    @Query(value = """
            UPDATE event_registrations SET status = 'CANCELLED', expires_at = NULL, updated_at = CURRENT_TIMESTAMP,
                last_actor_id = CAST(:actorId AS uuid)
            WHERE event_id = :eventId AND status IN
            ('REQUESTED', 'AWAITING_PAYMENT', 'AWAITING_ATTENDEE_CONFIRMATION', 'CONFIRMED', 'WAITLISTED')
            """, nativeQuery = true)
    int cancelActiveForEvent(@Param("eventId") UUID eventId, @Param("actorId") UUID actorId);

    long countByUserId(UUID userId);

    List<EventRegistrationJpaEntity> findAllByEventIdAndStatus(
            UUID eventId, EventRegistrationJpaEntity.RegistrationStatusEnum status);
}
