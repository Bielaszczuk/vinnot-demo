package com.vinnot.engagement.infrastructure.candidate;

import com.vinnot.engagement.application.model.CandidateQuery;
import com.vinnot.engagement.application.port.out.CandidateSourcePort;
import com.vinnot.engagement.domain.model.CandidateSignals;
import com.vinnot.engagement.domain.model.EngagementCandidate;
import com.vinnot.engagement.domain.model.PlanningMember;
import com.vinnot.notification.domain.model.NotificationType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * WEEKEND_EVENTS, on Thursdays (the account's local day): the published events starting Friday to Sunday in the
 * account's event area (its region by name, or within the same radius as new-event pushes of its location), grouped
 * into one push that names the most attended. Events the account organizes or is registered for, and organizers it
 * has a block with, are left out. Every page holds one time zone, so the whole page shares the weekend.
 */
@Component
public class WeekendEventsSource implements CandidateSourcePort {
    static final double RADIUS_KM = 50;
    private static final double KM_PER_DEGREE = 111.0;
    private static final double ROUNDING_SLACK = 0.1;
    private static final int WEEKEND_DAYS = 3;
    private static final double FULL_FIT_EVENTS = 3.0;
    private static final String SQL = """
            WITH members AS (SELECT unnest(?::uuid[]) AS user_id),
            areas AS (
                SELECT a.user_id, a.latitude, a.longitude, lower(trim(r.name)) AS region FROM user_event_areas a
                JOIN members m ON m.user_id = a.user_id LEFT JOIN regions r ON r.id = a.region_id),
            matches AS (
                SELECT ar.user_id, e.id, e.title, e.start_date, e.current_attendees, e.created_at
                FROM areas ar JOIN events e ON e.status = 'PUBLISHED' AND e.start_date >= ? AND e.start_date < ?
                WHERE e.organizer_id <> ar.user_id
                  AND NOT EXISTS (SELECT 1 FROM event_registrations g WHERE g.event_id = e.id AND g.user_id = ar.user_id)
                  AND NOT EXISTS (SELECT 1 FROM user_blocks b
                      WHERE (b.blocker_id = ar.user_id AND b.blocked_id = e.organizer_id)
                         OR (b.blocker_id = e.organizer_id AND b.blocked_id = ar.user_id))
                  AND ((ar.region IS NOT NULL AND ar.region IN (lower(trim(e.location_region)), lower(trim(e.location_city))))
                    OR (ar.latitude IS NOT NULL AND e.latitude IS NOT NULL AND e.longitude IS NOT NULL
                        AND ar.latitude BETWEEN e.latitude - ? AND e.latitude + ?
                        AND 2 * 6371 * asin(least(1, sqrt(power(sin(radians(e.latitude - ar.latitude) / 2), 2)
                            + cos(radians(ar.latitude)) * cos(radians(e.latitude))
                            * power(sin(radians(e.longitude - ar.longitude) / 2), 2)))) <= ?)))
            SELECT x.user_id, count(*) AS events, max(x.created_at) AS newest,
                   (array_agg(x.id ORDER BY x.current_attendees DESC, x.start_date, x.id))[1] AS top_id,
                   (array_agg(x.title ORDER BY x.current_attendees DESC, x.start_date, x.id))[1] AS top_title
            FROM matches x
            WHERE NOT EXISTS (SELECT 1 FROM engagement_sends xs WHERE xs.user_id = x.user_id AND xs.content_ref = ?)
            GROUP BY x.user_id
            """;
    private final JdbcTemplate jdbc;

    public WeekendEventsSource(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public NotificationType type() {
        return NotificationType.WEEKEND_EVENTS;
    }

    @Override
    public List<EngagementCandidate> find(CandidateQuery query) {
        if (query.members().isEmpty()) {
            return List.of();
        }
        ZoneId zone = query.members().getFirst().zone();
        LocalDate today = query.now().atZone(zone).toLocalDate();
        List<PlanningMember> members = query.members().stream().filter(member -> member.zone().equals(zone)).toList();
        if (today.getDayOfWeek() != DayOfWeek.THURSDAY) {
            return List.of();
        }
        LocalDate friday = today.plusDays(1);
        String contentRef = "WEEKEND:" + friday;
        double band = RADIUS_KM / KM_PER_DEGREE + ROUNDING_SLACK;
        return jdbc.query(SQL, (row, index) -> candidate(row, query.now(), contentRef), CandidateSql.ids(members),
                Timestamp.from(friday.atStartOfDay(zone).toInstant()),
                Timestamp.from(friday.plusDays(WEEKEND_DAYS).atStartOfDay(zone).toInstant()), band, band, RADIUS_KM, contentRef);
    }

    private static EngagementCandidate candidate(ResultSet row, Instant now, String contentRef) throws SQLException {
        int events = row.getInt("events");
        Map<String, String> data = new HashMap<>(Map.of("count", Integer.toString(events), "event", row.getString("top_title")));
        if (events == 1) {
            data.put("eventId", row.getObject("top_id", UUID.class).toString());
        }
        return new EngagementCandidate(row.getObject("user_id", UUID.class), NotificationType.WEEKEND_EVENTS, contentRef, data,
                new CandidateSignals(Math.min(1, events / FULL_FIT_EVENTS), CandidateSql.since(row.getTimestamp("newest"), now),
                        true, null));
    }
}
