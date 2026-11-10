package com.vinnot.event.infrastructure.notification;
import com.vinnot.event.application.port.out.EventNotificationPreferences;
import com.vinnot.event.application.port.out.EventRegistrationNoticeReader;
import com.vinnot.event.application.query.response.EventOrganizerNotice;
import com.vinnot.event.application.query.response.EventRegistrationNotice;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import java.util.Optional;
import java.util.UUID;
import com.vinnot.event.application.query.response.EventAttendeeNotice;
import java.util.List;
import java.util.Objects;
@Component
@RequiredArgsConstructor
public class PostgresEventNotificationReader implements EventRegistrationNoticeReader, EventNotificationPreferences {
    private final JdbcTemplate jdbc;
    @Override public void setLanguage(UUID registrationId, String language) {
        jdbc.update("UPDATE event_registrations SET notification_language=? WHERE id=?", "en".equals(language) ? "en" : "es", registrationId);
    }
    /** The organizer copy uses the organizer's own language; the attendee copy the language chosen when registering. */
    @Override public Optional<EventRegistrationNotice> findCurrent(UUID registrationId, long version, boolean organizer) {
        return jdbc.query("""
                SELECT r.id,r.event_id,r.status,r.payment_status,r.attendee_count,
                    r.expires_at,r.contact_name,r.contact_phone,e.title,e.start_date,e.timezone,
                    CASE WHEN ? THEN owner.email ELSE attendee.email END AS recipient,
                    CASE WHEN ? THEN owner.id ELSE attendee.id END AS recipient_id,
                    CASE WHEN ? THEN owner.preferred_language ELSE r.notification_language END AS language
                FROM event_registrations r JOIN events e ON e.id=r.event_id
                JOIN users owner ON owner.id=e.organizer_id JOIN users attendee ON attendee.id=r.user_id
                WHERE r.id=? AND r.notification_version=?
                """, (row,index) -> {
                    var expiry = row.getTimestamp("expires_at");
                    return new EventRegistrationNotice(row.getObject("id",UUID.class),row.getObject("event_id",UUID.class),
                        row.getString("recipient"),row.getObject("recipient_id",UUID.class),row.getString("language"),organizer,row.getString("title"),
                        row.getString("status"),row.getString("payment_status"),row.getInt("attendee_count"),
                        row.getTimestamp("start_date").toInstant(),Objects.isNull(expiry) ? null : expiry.toInstant(),
                        row.getString("contact_name"),row.getString("contact_phone"),row.getString("timezone"));
                },organizer,organizer,organizer,registrationId,version).stream().findFirst();
    }
    @Override public Optional<EventOrganizerNotice> findOrganizer(UUID eventId) {
        return jdbc.query("""
                SELECT e.organizer_id,owner.preferred_language,e.timezone
                FROM events e JOIN users owner ON owner.id=e.organizer_id WHERE e.id=?
                """, (row,index) -> new EventOrganizerNotice(row.getObject("organizer_id",UUID.class),
                        row.getString("preferred_language"),row.getString("timezone")),eventId).stream().findFirst();
    }

    @Override public List<EventAttendeeNotice> findActiveAttendees(UUID eventId) {
        return attendees(eventId, "'REQUESTED','AWAITING_PAYMENT','AWAITING_ATTENDEE_CONFIRMATION','CONFIRMED','WAITLISTED'");
    }

    @Override public List<EventAttendeeNotice> findConfirmedAttendees(UUID eventId) {
        return attendees(eventId, "'CONFIRMED'");
    }

    /** The statuses are fixed literals of this class, never input. */
    private List<EventAttendeeNotice> attendees(UUID eventId, String statuses) {
        return jdbc.query("""
                SELECT r.id,r.user_id,attendee.email,r.notification_language,r.payment_status,r.externally_managed_payment
                FROM event_registrations r JOIN users attendee ON attendee.id=r.user_id
                WHERE r.event_id=? AND r.status IN (""" + statuses + """
                ) ORDER BY r.created_at,r.id
                """, (row,index) -> new EventAttendeeNotice(
                        row.getObject("id",UUID.class),row.getObject("user_id",UUID.class),row.getString("email"),row.getString("notification_language"),
                        row.getString("payment_status"),row.getBoolean("externally_managed_payment")),eventId);
    }
}
