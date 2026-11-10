package com.vinnot.event.infrastructure.notification;

import com.vinnot.event.application.port.out.EventReminderStore;
import com.vinnot.event.domain.valueobject.EventLocation;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Claims reminders with one statement: rows locked by another instance are skipped, and reminded_at is set in the
 * caller's transaction, so each registration is reminded once. Setting reminded_at leaves notification_version
 * untouched, so the registration trigger queues nothing.
 */
@Component
@RequiredArgsConstructor
public class PostgresEventReminderStore implements EventReminderStore {
    private final JdbcTemplate jdbc;

    @Override
    public List<DueReminder> claimDue(Window window, Instant from, Instant until, Instant claimedAt, int limit) {
        // The column is a fixed literal chosen by the window, never input.
        String column = window == Window.SOON ? "reminded_soon_at" : "reminded_at";
        return jdbc.query("""
                WITH due AS (
                    SELECT r.id FROM event_registrations r JOIN events e ON e.id = r.event_id
                    WHERE r.status = 'CONFIRMED' AND r.%1$s IS NULL AND e.status IN ('PUBLISHED','SOLD_OUT')
                      AND e.start_date > ? AND e.start_date <= ?
                    ORDER BY e.start_date, r.id LIMIT ?
                    FOR UPDATE OF r SKIP LOCKED)
                UPDATE event_registrations r SET %1$s = ?
                FROM due, events e, users attendee
                WHERE r.id = due.id AND e.id = r.event_id AND attendee.id = r.user_id
                RETURNING r.id, r.user_id, attendee.email, r.notification_language, e.title, e.start_date, e.timezone,
                    e.location_name, e.location_address, e.location_city, e.location_region, e.location_country
                """.formatted(column), (row, index) -> new DueReminder(row.getObject("id", UUID.class),
                        row.getObject("user_id", UUID.class), row.getString("email"),
                        row.getString("notification_language"), row.getString("title"),
                        row.getTimestamp("start_date").toInstant(), row.getString("timezone"),
                        EventLocation.of(row.getString("location_name"), row.getString("location_address"),
                                row.getString("location_city"), row.getString("location_region"),
                                row.getString("location_country"), null, null).getReadableVenue()),
                Timestamp.from(from), Timestamp.from(until), limit, Timestamp.from(claimedAt));
    }

    @Override
    public void rearm(UUID eventId) {
        jdbc.update("""
                UPDATE event_registrations SET reminded_at = NULL, reminded_soon_at = NULL
                WHERE event_id = ? AND (reminded_at IS NOT NULL OR reminded_soon_at IS NOT NULL)
                """, eventId);
    }
}
