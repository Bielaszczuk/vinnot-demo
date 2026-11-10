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
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * CELLAR_CHECKIN, monthly: the oldest wine kept in the cellar for more than 30 days without a rating or a review, never
 * asked about before.
 */
@Component
public class CellarCheckinSource implements CandidateSourcePort {
    static final Duration UNRATED_FOR = Duration.ofDays(30);
    private static final double FIT = 0.6;
    private static final String SQL = """
            SELECT DISTINCT ON (c.user_id) c.user_id, c.id AS cellar_id, w.id, w.name, w.vintage, c.created_at
            FROM cellar_wines c JOIN wines w ON w.id = c.wine_id
            WHERE c.user_id = ANY (?::uuid[]) AND c.rating_decimal IS NULL AND c.created_at < ?
              AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.user_id = c.user_id AND r.wine_id = c.wine_id)
            """ + CandidateSql.notSuggested("c.user_id", "'CELLAR:' || c.id") + """
            ORDER BY c.user_id, c.created_at, c.id
            """;
    private final JdbcTemplate jdbc;

    public CellarCheckinSource(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public NotificationType type() {
        return NotificationType.CELLAR_CHECKIN;
    }

    @Override
    public List<EngagementCandidate> find(CandidateQuery query) {
        if (query.members().isEmpty()) {
            return List.of();
        }
        return jdbc.query(SQL, (row, index) -> candidate(row, query.now()), CandidateSql.ids(query.members()),
                Timestamp.from(query.now().minus(UNRATED_FOR)));
    }

    private static EngagementCandidate candidate(ResultSet row, Instant now) throws SQLException {
        String wineId = row.getObject("id", UUID.class).toString();
        return new EngagementCandidate(row.getObject("user_id", UUID.class), NotificationType.CELLAR_CHECKIN,
                "CELLAR:" + row.getObject("cellar_id", UUID.class),
                Map.of("wineId", wineId, "wine", CandidateSql.wineName(row, "name", "vintage")),
                new CandidateSignals(FIT, CandidateSql.since(row.getTimestamp("created_at"), now), false, null));
    }
}
