package com.vinnot.event.infrastructure.notification;

import com.vinnot.event.application.port.out.NewEventAudience;
import com.vinnot.event.domain.valueobject.EventArea;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Matches areas in one statement. Region names compare case- and space-insensitively with the event's free-text region
 * and city; locations use the haversine distance, after a latitude band that keeps the location index useful. A block
 * either way between the member and the organizer keeps the member out, as in the likes summary.
 */
@Component
@RequiredArgsConstructor
public class PostgresNewEventAudience implements NewEventAudience {
    private static final double KM_PER_DEGREE = 111.0;
    /** A rounded location may sit up to about 0.07 degrees from the real one. */
    private static final double ROUNDING_SLACK = 0.1;
    private final JdbcTemplate jdbc;

    @Override
    public List<UUID> near(Place place) {
        double band = EventArea.RADIUS_KM / KM_PER_DEGREE + ROUNDING_SLACK;
        return jdbc.queryForList("""
                SELECT a.user_id FROM user_event_areas a
                CROSS JOIN (SELECT ?::uuid AS organizer_id, ?::text AS region, ?::text AS city,
                    ?::double precision AS latitude, ?::double precision AS longitude) e
                LEFT JOIN regions r ON r.id = a.region_id
                WHERE a.user_id <> e.organizer_id
                AND NOT EXISTS (SELECT 1 FROM user_blocks b
                                WHERE (b.blocker_id = a.user_id AND b.blocked_id = e.organizer_id)
                                   OR (b.blocker_id = e.organizer_id AND b.blocked_id = a.user_id))
                AND (
                    (r.id IS NOT NULL AND lower(trim(r.name)) IN (lower(trim(e.region)), lower(trim(e.city))))
                    OR (a.latitude IS NOT NULL AND e.latitude IS NOT NULL AND e.longitude IS NOT NULL
                        AND a.latitude BETWEEN e.latitude - ? AND e.latitude + ?
                        AND 2 * 6371 * asin(least(1, sqrt(power(sin(radians(e.latitude - a.latitude) / 2), 2)
                            + cos(radians(a.latitude)) * cos(radians(e.latitude))
                            * power(sin(radians(e.longitude - a.longitude) / 2), 2)))) <= ?))
                ORDER BY a.user_id
                """, UUID.class, place.organizerId(), place.region(), place.city(), place.latitude(), place.longitude(),
                band, band, EventArea.RADIUS_KM);
    }
}
