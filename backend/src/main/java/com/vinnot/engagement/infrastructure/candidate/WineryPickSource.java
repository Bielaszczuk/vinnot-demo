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
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * WINERY_PICK, about every four weeks, taking turns with the route between wines of the week: an active winery of the
 * region whose wines the account rated highly most often (reviews and cellar ratings), best rated first, that it was
 * not suggested before and whose wines it never rated.
 */
@Component
public class WineryPickSource implements CandidateSourcePort {
    /** Liked wines of a region for a full fit. */
    private static final double FULL_FIT_RATINGS = 5.0;
    private static final double MAX_RATING = 5.0;
    private static final double HALF = 0.5;
    private static final String SQL = """
            WITH members AS (SELECT unnest(?::uuid[]) AS user_id),
            liked AS (
                SELECT rated.user_id, w.region_id, count(*) AS rated FROM (
                    SELECT r.user_id, r.wine_id FROM reviews r JOIN members m ON m.user_id = r.user_id
                    WHERE r.rating >= ? AND r.publication_status <> 'REJECTED'
                    UNION
                    SELECT c.user_id, c.wine_id FROM cellar_wines c JOIN members m ON m.user_id = c.user_id
                    WHERE c.rating_decimal >= ?) AS rated
                JOIN wines w ON w.id = rated.wine_id WHERE w.region_id IS NOT NULL
                GROUP BY rated.user_id, w.region_id)
            SELECT DISTINCT ON (l.user_id) l.user_id, l.rated, y.id, y.name, y.created_at, y.ratings_average, g.name AS region
            FROM liked l JOIN wineries y ON y.region_id = l.region_id AND y.is_active JOIN regions g ON g.id = y.region_id
            WHERE NOT EXISTS (SELECT 1 FROM wines yw JOIN reviews yr ON yr.wine_id = yw.id
                              WHERE yw.winery_id = y.id AND yr.user_id = l.user_id)
            """ + CandidateSql.notSuggested("l.user_id", "'WINERY:' || y.id") + """
            ORDER BY l.user_id, l.rated DESC, y.ratings_average DESC NULLS LAST, y.ratings_count DESC NULLS LAST, y.id
            """;
    private final JdbcTemplate jdbc;

    public WineryPickSource(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public NotificationType type() {
        return NotificationType.WINERY_PICK;
    }

    @Override
    public List<EngagementCandidate> find(CandidateQuery query) {
        if (query.members().isEmpty()) {
            return List.of();
        }
        return jdbc.query(SQL, (row, index) -> candidate(row, query.now()), CandidateSql.ids(query.members()),
                CandidateSql.LIKED_RATING, CandidateSql.LIKED_RATING);
    }

    private static EngagementCandidate candidate(ResultSet row, Instant now) throws SQLException {
        String wineryId = row.getObject("id", UUID.class).toString();
        double fit = HALF * Math.min(1, row.getInt("rated") / FULL_FIT_RATINGS) + HALF * row.getDouble("ratings_average") / MAX_RATING;
        return new EngagementCandidate(row.getObject("user_id", UUID.class), NotificationType.WINERY_PICK,
                "WINERY:" + wineryId, Map.of("wineryId", wineryId, "winery", row.getString("name"),
                        "region", row.getString("region")),
                new CandidateSignals(fit, CandidateSql.since(row.getTimestamp("created_at"), now), true, null));
    }
}
