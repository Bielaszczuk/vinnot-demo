package com.vinnot.event.infrastructure.notification;

import com.vinnot.event.application.port.out.OrganizerActivityDigest;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.Locale;

/** One row per event with an open digest; due times use the database clock, for adding and claiming alike. */
@Component
@RequiredArgsConstructor
public class PostgresOrganizerActivityDigest implements OrganizerActivityDigest {
    private final JdbcTemplate jdbc;

    @Override
    public void add(UUID eventId, UUID organizerId, Activity activity, Duration window) {
        // The column is a fixed literal chosen by the activity, never input.
        String column = activity.name().toLowerCase(Locale.ROOT);
        jdbc.update("""
                INSERT INTO organizer_push_digests(event_id, organizer_id, %1$s, due_at)
                VALUES (?, ?, 1, now() + make_interval(secs => ?))
                ON CONFLICT (event_id) DO UPDATE SET %1$s = organizer_push_digests.%1$s + 1
                """.formatted(column), eventId, organizerId, window.toSeconds());
    }

    @Override
    public List<Due> claimDue(int limit) {
        return jdbc.query("""
                WITH due AS (
                    SELECT event_id FROM organizer_push_digests WHERE due_at <= now()
                    ORDER BY due_at, event_id LIMIT ? FOR UPDATE SKIP LOCKED)
                DELETE FROM organizer_push_digests d USING due, events e
                WHERE d.event_id = due.event_id AND e.id = d.event_id
                RETURNING d.event_id, d.organizer_id, e.title, d.confirmed, d.requested, d.cancelled, d.due_at,
                    e.status IN ('PUBLISHED','SOLD_OUT') AS active
                """, (row, index) -> new Due(row.getObject("event_id", UUID.class), row.getObject("organizer_id", UUID.class),
                row.getString("title"), row.getInt("confirmed"), row.getInt("requested"), row.getInt("cancelled"),
                row.getTimestamp("due_at").toInstant(), row.getBoolean("active")), limit);
    }
}
