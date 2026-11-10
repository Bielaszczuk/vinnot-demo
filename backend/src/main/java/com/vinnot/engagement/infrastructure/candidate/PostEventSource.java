package com.vinnot.engagement.infrastructure.candidate;

import com.vinnot.engagement.application.model.CandidateQuery;
import com.vinnot.engagement.application.port.out.CandidateSourcePort;
import com.vinnot.engagement.domain.model.CandidateSignals;
import com.vinnot.engagement.domain.model.EngagementCandidate;
import com.vinnot.notification.domain.model.NotificationType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * POST_EVENT, once: the day after an event the account attended (a confirmed registration of an event that was not
 * cancelled and ended yesterday, in the account's time zone).
 */
@Component
public class PostEventSource implements CandidateSourcePort {
    private static final String SQL = """
            SELECT DISTINCT ON (g.user_id) g.user_id, e.id, e.title FROM event_registrations g
            JOIN events e ON e.id = g.event_id
            WHERE g.user_id = ANY (?::uuid[]) AND g.status = 'CONFIRMED' AND e.status IN ('PUBLISHED', 'SOLD_OUT', 'COMPLETED')
              AND e.end_date >= ? AND e.end_date < ?
            """ + CandidateSql.notSuggested("g.user_id", "'EVENT:' || e.id || ':after'") + """
            ORDER BY g.user_id, e.end_date DESC, e.id
            """;
    private final JdbcTemplate jdbc;

    public PostEventSource(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public NotificationType type() {
        return NotificationType.POST_EVENT;
    }

    @Override
    public List<EngagementCandidate> find(CandidateQuery query) {
        if (query.members().isEmpty()) {
            return List.of();
        }
        ZoneId zone = query.members().getFirst().zone();
        LocalDate today = query.now().atZone(zone).toLocalDate();
        return jdbc.query(SQL, PostEventSource::candidate, CandidateSql.ids(query.members()),
                Timestamp.from(today.minusDays(1).atStartOfDay(zone).toInstant()),
                Timestamp.from(today.atStartOfDay(zone).toInstant()));
    }

    private static EngagementCandidate candidate(ResultSet row, int index) throws SQLException {
        String eventId = row.getObject("id", UUID.class).toString();
        return new EngagementCandidate(row.getObject("user_id", UUID.class), NotificationType.POST_EVENT,
                "EVENT:" + eventId + ":after", Map.of("eventId", eventId, "event", row.getString("title")),
                CandidateSignals.fit(1));
    }
}
