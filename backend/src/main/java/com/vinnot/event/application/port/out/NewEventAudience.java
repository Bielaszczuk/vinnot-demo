package com.vinnot.event.application.port.out;

import com.vinnot.event.domain.valueobject.EventArea;

import java.util.List;
import java.util.UUID;

/** Who should hear that an event was published near them. */
public interface NewEventAudience {
    /**
     * Accounts whose area matches the event's place, except its organizer and anyone with a block either way with the
     * organizer: a region named like the event's region or city, or an approximate location within
     * {@link EventArea#RADIUS_KM} of the event.
     * The place comes from the event in memory, so an event saved in the same transaction matches before it is flushed.
     */
    List<UUID> near(Place place);

    /**
     * Where a new event happens. Any field except the organizer may be null.
     *
     * @param organizerId who never hears about their own event
     * @param region      the event's free-text region
     * @param city        the event's free-text city
     * @param latitude    the event's latitude
     * @param longitude   the event's longitude
     */
    record Place(UUID organizerId, String region, String city, Double latitude, Double longitude) { }
}
