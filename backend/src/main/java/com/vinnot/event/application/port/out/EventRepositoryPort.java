package com.vinnot.event.application.port.out;

import com.vinnot.event.domain.model.Event;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.time.Instant;

public interface EventRepositoryPort {

    /**
     * Finds an event by ID.
     *
     * @param id the event ID
     * @return the event if found
     */
    Optional<Event> findById(UUID id);

    Optional<Event> findByIdForUpdate(UUID id);

    /**
     * Gets all events paginated.
     *
     * @param pageQuery pagination info
     * @return page of events
     */
    PageResult<Event> findAll(PageQuery pageQuery);

    /**
     * Gets published events paginated.
     *
     * @param pageQuery pagination info
     * @return page of published events
     */
    PageResult<Event> findPublished(PageQuery pageQuery);

    /**
     * Gets upcoming events paginated.
     *
     * @param pageQuery pagination info
     * @return page of upcoming events
     */
    PageResult<Event> findUpcoming(PageQuery pageQuery);

    /**
     * Searches events with filters.
     *
     * @param searchTerm search term for title
     * @param eventType  event type filter
     * @param city       city filter
     * @param region     region/province filter
     * @param country    country filter
     * @param pageQuery  pagination info
     * @return page of matching events
     */
    PageResult<Event> search(
            String searchTerm,
            String eventType,
            String city,
            String region,
            String country,
            PageQuery pageQuery);

    /**
     * Gets events near a location.
     *
     * @param latitude  the latitude
     * @param longitude the longitude
     * @param radiusKm  the search radius in kilometers
     * @param limit     maximum results
     * @return list of nearby events
     */
    List<Event> findNearby(double latitude, double longitude, double radiusKm, int limit);

    /**
     * Gets bounded public event candidates for location-aware discovery.
     *
     * @param limit maximum number of candidates
     * @return active public events, including events without coordinates
     */
    List<Event> findDiscoveryCandidates(int limit);

    /**
     * Gets events by organizer.
     *
     * @param organizerId the organizer user ID
     * @param pageQuery    pagination info
     * @return page of events
     */
    PageResult<Event> findByOrganizer(UUID organizerId, PageQuery pageQuery);

    /**
     * Searches an organizer's own events, in any state, by text.
     *
     * @param organizerId the organizer user ID
     * @param searchTerm  non-blank text matched, ignoring case, against the title, venue, city, region or country
     * @param pageQuery   pagination info
     * @return page of matching events
     */
    PageResult<Event> searchByOrganizer(UUID organizerId, String searchTerm, PageQuery pageQuery);

    /**
     * Saves an event.
     *
     * @param event the event to save
     * @return the saved event
     */
    Event save(Event event);

    /**
     * Saves a cancelled event and cancels its active registrations on behalf of {@code actorId}.
     *
     * @param event the cancelled event
     * @param actorId the user who cancelled it
     * @return how many registrations this call cancelled
     */
    int saveCancellation(Event event, UUID actorId);

    /**
     * Deletes an event.
     *
     * @param event the event to delete
     */
    void delete(Event event);

    /**
     * Checks if an event exists.
     *
     * @param id the event ID
     * @return true if exists
     */
    boolean existsById(UUID id);

    /**
     * Counts total events.
     *
     * @return the total count
     */
    long count();

    /**
     * Counts published events.
     *
     * @return the count of published events
     */
    long countPublished();

    /**
     * Searches all events (no status filter, for admin).
     *
     * @param searchTerm search term for title
     * @param eventType  event type filter
     * @param city       city filter
     * @param pageQuery   pagination info
     * @return page of matching events
     */
    PageResult<Event> searchAll(String searchTerm, String eventType, String city, PageQuery pageQuery);

    /**
     * Counts event registrations for a user.
     *
     * @param userId the user ID
     * @return the count of registrations
     */
    long countRegistrationsByUserId(UUID userId);

    int completeExpiredEvents(Instant now);
}
