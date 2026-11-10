package com.vinnot.event.infrastructure.persistence.jpa;

import com.vinnot.event.infrastructure.persistence.entity.EventJpaEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;

@Repository
public interface EventJpaRepository extends JpaRepository<EventJpaEntity, UUID> {

    /**
     * Finds published events.
     *
     * @param pageable pagination info
     * @return page of published events
     */
    @Query("SELECT e FROM EventJpaEntity e "
            + "WHERE e.status IN :statuses AND e.endDate > :now "
            + "ORDER BY e.startDate ASC")
    Page<EventJpaEntity> findPublic(
            @Param("statuses") List<EventJpaEntity.EventStatusEnum> statuses,
            @Param("now") Instant now,
            Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM EventJpaEntity e WHERE e.id = :id")
    Optional<EventJpaEntity> findByIdForUpdate(@Param("id") UUID id);

    /**
     * Finds upcoming published events.
     *
     * @param status   the status
     * @param now      current time
     * @param pageable pagination info
     * @return page of upcoming events
     */
    @Query("SELECT e FROM EventJpaEntity e "
            + "WHERE e.status IN :statuses AND e.startDate > :now "
            + "ORDER BY e.startDate ASC")
    Page<EventJpaEntity> findUpcoming(
            @Param("statuses") List<EventJpaEntity.EventStatusEnum> statuses,
            @Param("now") Instant now,
            Pageable pageable
    );

    /**
     * Searches events with filters.
     *
     * @param searchTerm the search term
     * @param eventType  the event type
     * @param city       the city
     * @param region     the region/province
     * @param country    the country
     * @param pageable   pagination info
     * @return page of matching events
     */
    @Query("SELECT e FROM EventJpaEntity e WHERE e.status IN :statuses "
            + "AND e.endDate > :now "
            + "AND (:searchTerm IS NULL OR LOWER(e.title) LIKE "
            + "LOWER(CONCAT('%', CAST(:searchTerm AS string), '%')) "
            + "OR LOWER(COALESCE(e.locationName, '')) LIKE "
            + "LOWER(CONCAT('%', CAST(:searchTerm AS string), '%')) "
            + "OR LOWER(TRIM(COALESCE(e.locationCity, ''))) LIKE "
            + "LOWER(CONCAT('%', CAST(:searchTerm AS string), '%')) "
            + "OR LOWER(TRIM(COALESCE(e.locationRegion, ''))) LIKE "
            + "LOWER(CONCAT('%', CAST(:searchTerm AS string), '%')) "
            + "OR LOWER(TRIM(COALESCE(e.locationCountry, ''))) LIKE "
            + "LOWER(CONCAT('%', CAST(:searchTerm AS string), '%'))) "
            + "AND (:eventType IS NULL OR e.eventType = :eventType) "
            + "AND (:city IS NULL OR LOWER(TRIM(COALESCE(e.locationCity, ''))) LIKE "
            + "LOWER(CONCAT('%', CAST(:city AS string), '%'))) "
            + "AND (:region IS NULL OR LOWER(TRIM(COALESCE(e.locationRegion, ''))) LIKE "
            + "LOWER(CONCAT('%', CAST(:region AS string), '%'))) "
            + "AND (:country IS NULL OR LOWER(TRIM(COALESCE(e.locationCountry, ''))) LIKE "
            + "LOWER(CONCAT('%', CAST(:country AS string), '%'))) "
            + "ORDER BY e.startDate ASC")
    Page<EventJpaEntity> search(
            @Param("searchTerm") String searchTerm,
            @Param("eventType") EventJpaEntity.EventTypeEnum eventType,
            @Param("city") String city,
            @Param("region") String region,
            @Param("country") String country,
            @Param("statuses") List<EventJpaEntity.EventStatusEnum> statuses,
            @Param("now") Instant now,
            Pageable pageable
    );

    /**
     * Searches all events with filters (no status filter, for admin use).
     *
     * @param searchTerm the search term
     * @param eventType  the event type
     * @param city       the city
     * @param pageable   pagination info
     * @return page of matching events
     */
    @Query("SELECT e FROM EventJpaEntity e "
            + "WHERE (:searchTerm IS NULL OR LOWER(e.title) LIKE "
            + "LOWER(CONCAT('%', CAST(:searchTerm AS string), '%'))) "
            + "AND (:eventType IS NULL OR e.eventType = :eventType) "
            + "AND (:city IS NULL OR LOWER(TRIM(COALESCE(e.locationCity, ''))) "
            + "= LOWER(TRIM(CAST(:city AS string)))) "
            + "ORDER BY e.startDate ASC")
    Page<EventJpaEntity> searchAll(
            @Param("searchTerm") String searchTerm,
            @Param("eventType") EventJpaEntity.EventTypeEnum eventType,
            @Param("city") String city,
            Pageable pageable
    );

    /**
     * Finds events near a location using Haversine formula approximation.
     *
     * @param latitude  the latitude
     * @param longitude the longitude
     * @param status    the status
     * @param now       current time
     * @param pageable  pagination info
     * @return page of nearby events
     */
    @Query("SELECT e FROM EventJpaEntity e WHERE e.status IN :statuses "
            + "AND e.endDate > :now "
            + "AND e.latitude IS NOT NULL AND e.longitude IS NOT NULL "
            + "ORDER BY (e.latitude - :lat) * (e.latitude - :lat) + (e.longitude - :lng) * (e.longitude - :lng) ASC")
    List<EventJpaEntity> findNearby(
            @Param("lat") double latitude,
            @Param("lng") double longitude,
            @Param("statuses") List<EventJpaEntity.EventStatusEnum> statuses,
            @Param("now") Instant now,
            Pageable pageable
    );

    @Query("SELECT e FROM EventJpaEntity e "
            + "WHERE e.status IN :statuses AND e.endDate > :now "
            + "ORDER BY e.startDate ASC")
    List<EventJpaEntity> findDiscoveryCandidates(
            @Param("statuses") List<EventJpaEntity.EventStatusEnum> statuses,
            @Param("now") Instant now,
            Pageable pageable);

    /**
     * Finds events by organizer.
     *
     * @param organizerId the organizer ID
     * @param pageable    pagination info
     * @return page of events
     */
    Page<EventJpaEntity> findByOrganizerId(UUID organizerId, Pageable pageable);

    /**
     * Searches an organizer's events in any state over the same text fields as the public search.
     *
     * @param organizerId the organizer user ID
     * @param searchTerm  the non-blank search term
     * @param pageable    pagination and sort info
     * @return page of matching events
     */
    @Query("SELECT e FROM EventJpaEntity e WHERE e.organizerId = :organizerId "
            + "AND (LOWER(e.title) LIKE LOWER(CONCAT('%', CAST(:searchTerm AS string), '%')) "
            + "OR LOWER(COALESCE(e.locationName, '')) LIKE LOWER(CONCAT('%', CAST(:searchTerm AS string), '%')) "
            + "OR LOWER(TRIM(COALESCE(e.locationCity, ''))) LIKE LOWER(CONCAT('%', CAST(:searchTerm AS string), '%')) "
            + "OR LOWER(TRIM(COALESCE(e.locationRegion, ''))) LIKE LOWER(CONCAT('%', CAST(:searchTerm AS string), '%')) "
            + "OR LOWER(TRIM(COALESCE(e.locationCountry, ''))) LIKE LOWER(CONCAT('%', CAST(:searchTerm AS string), '%')))")
    Page<EventJpaEntity> searchByOrganizerId(
            @Param("organizerId") UUID organizerId,
            @Param("searchTerm") String searchTerm,
            Pageable pageable);

    /**
     * Counts events by status.
     *
     * @param status the status
     * @return count
     */
    long countByStatus(EventJpaEntity.EventStatusEnum status);

    long countByStatusInAndEndDateAfter(
            List<EventJpaEntity.EventStatusEnum> statuses,
            Instant now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE EventJpaEntity e SET e.status = :completed, e.updatedAt = :now "
            + "WHERE e.status IN :activeStatuses AND e.endDate <= :now")
    int completeExpiredEvents(
            @Param("activeStatuses") List<EventJpaEntity.EventStatusEnum> activeStatuses,
            @Param("completed") EventJpaEntity.EventStatusEnum completed,
            @Param("now") Instant now);
}
