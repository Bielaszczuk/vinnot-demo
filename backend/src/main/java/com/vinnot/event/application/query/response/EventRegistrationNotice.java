package com.vinnot.event.application.query.response;
import java.time.Instant;
import java.util.UUID;
/**
 * Delivery data, never logged or returned by public endpoints. {@code language} is the recipient's: the
 * registration language for the attendee, the organizer's preferred language for the organizer.
 * {@code timeZone} is the event's IANA zone, shared by every recipient. {@code recipientId} is the account the
 * notice is written for (attendee or organizer), used to push to its devices.
 */
public record EventRegistrationNotice(UUID registrationId, UUID eventId, String recipient, UUID recipientId,
        String language, boolean organizer, String title, String status, String paymentStatus,
        int attendees, Instant startDate, Instant expiresAt, String contactName, String contactPhone,
        String timeZone) {
    /** A notice for an event without a known zone; its dates are shown in UTC. */
    public EventRegistrationNotice(UUID registrationId, UUID eventId, String recipient, UUID recipientId,
            String language, boolean organizer, String title, String status, String paymentStatus,
            int attendees, Instant startDate, Instant expiresAt, String contactName, String contactPhone) {
        this(registrationId, eventId, recipient, recipientId, language, organizer, title, status, paymentStatus, attendees,
                startDate, expiresAt, contactName, contactPhone, "UTC");
    }

    @Override public String toString() { return "EventRegistrationNotice[REDACTED]"; }
}
