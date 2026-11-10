package com.vinnot.event.application.port.out;
import com.vinnot.event.application.query.response.EventAttendeeNotice;
import com.vinnot.event.application.query.response.EventOrganizerNotice;
import com.vinnot.event.application.query.response.EventRegistrationNotice;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
public interface EventRegistrationNoticeReader {
    Optional<EventRegistrationNotice> findCurrent(UUID registrationId, long version, boolean organizer);

    Optional<EventOrganizerNotice> findOrganizer(UUID eventId);

    /** Registrations an event cancellation cancels: requested, awaiting payment or confirmation, confirmed, waitlisted. */
    List<EventAttendeeNotice> findActiveAttendees(UUID eventId);

    /** Confirmed registrations, the ones told about a change of date, time or venue. */
    List<EventAttendeeNotice> findConfirmedAttendees(UUID eventId);
}
