package com.vinnot.user.infrastructure.persistence.adapter;

import com.vinnot.user.application.port.out.UpcomingPaidEventsPort;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Reads events, registrations and checkout attempts directly, like {@link AccountDeletionIntegrity}: the check runs in
 * the deletion transaction, before the cascades that would remove these rows.
 */
@Component
@RequiredArgsConstructor
public class UpcomingPaidEventsAdapter implements UpcomingPaidEventsPort {
    private final JdbcTemplate jdbc;

    @Override
    public boolean organizesUpcomingPaidEvents(UUID userId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (
                  SELECT 1 FROM events e
                  JOIN event_registrations r ON r.event_id = e.id
                  JOIN payment_checkout_attempts a ON a.registration_id = r.id
                  WHERE e.organizer_id = ?
                    AND e.status NOT IN ('CANCELLED', 'COMPLETED')
                    AND e.end_date > now()
                    AND r.status IN ('AWAITING_PAYMENT', 'AWAITING_ATTENDEE_CONFIRMATION', 'CONFIRMED'))
                """, Boolean.class, userId));
    }
}
