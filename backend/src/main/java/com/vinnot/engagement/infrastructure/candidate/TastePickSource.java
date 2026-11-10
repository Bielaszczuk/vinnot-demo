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
 * TASTE_PICK, weekly: the best wine for a grape or type the account rates highly that it has not rated, kept or been
 * suggested. The pool (the most rated active wines per liked grape or type) is built in one pass over the catalog for
 * the whole page; fit grows with how highly the account rates that grape or type.
 */
@Component
public class TastePickSource implements CandidateSourcePort {
    /** Wines per grape or type considered, most rated first. */
    static final int POOL_SIZE = 30;
    private static final double SCORE_FLOOR = 3.0;
    private static final double SCORE_SPAN = 2.0;
    private static final String SQL = """
            WITH members AS (SELECT unnest(?::uuid[]) AS user_id),
            liked AS (
                SELECT a.user_id, a.kind, a.value, a.label, a.score FROM user_taste_affinities a
                JOIN members m ON m.user_id = a.user_id WHERE a.rated_wines >= ? AND a.score >= ?),
            wanted AS (SELECT DISTINCT kind, value FROM liked),
            pool AS (
                SELECT x.kind, x.value, w.id, w.name, w.vintage, w.created_at, w.created_by,
                       row_number() OVER (PARTITION BY x.kind, x.value
                                          ORDER BY w.rating_count DESC, w.rating_average DESC, w.id) AS position
                FROM wines w
                CROSS JOIN LATERAL (
                    SELECT 'TYPE'::text AS kind, upper(trim(w.wine_type)) AS value
                    UNION ALL
                    SELECT 'GRAPE', lower(trim(g.name)) FROM jsonb_array_elements_text(
                        CASE WHEN jsonb_typeof(w.grapes) = 'array' THEN w.grapes ELSE '[]'::jsonb END) AS g(name)) AS x
                WHERE w.is_active AND (x.kind, x.value) IN (SELECT kind, value FROM wanted))
            SELECT DISTINCT ON (l.user_id) l.user_id, l.kind, l.label, l.score, p.id, p.name, p.vintage, p.created_at
            FROM liked l JOIN pool p ON p.kind = l.kind AND p.value = l.value AND p.position <= ?
            WHERE true
            """ + CandidateSql.suggestableWine("l.user_id", "p") + """
            ORDER BY l.user_id, l.score DESC, (l.kind = 'GRAPE') DESC, p.position
            """;
    private final JdbcTemplate jdbc;

    public TastePickSource(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public NotificationType type() {
        return NotificationType.TASTE_PICK;
    }

    @Override
    public List<EngagementCandidate> find(CandidateQuery query) {
        if (query.members().isEmpty()) {
            return List.of();
        }
        return jdbc.query(SQL, (row, index) -> candidate(row, query.now()), CandidateSql.ids(query.members()),
                CandidateSql.MIN_RATED_WINES, CandidateSql.MIN_AVERAGE, POOL_SIZE);
    }

    private static EngagementCandidate candidate(ResultSet row, Instant now) throws SQLException {
        String wineId = row.getObject("id", UUID.class).toString();
        double fit = (row.getDouble("score") - SCORE_FLOOR) / SCORE_SPAN;
        return new EngagementCandidate(row.getObject("user_id", UUID.class), NotificationType.TASTE_PICK, "WINE:" + wineId,
                Map.of("wineId", wineId, "wine", CandidateSql.wineName(row, "name", "vintage"),
                        "reasonKind", row.getString("kind"), "reason", row.getString("label")),
                new CandidateSignals(fit, CandidateSql.since(row.getTimestamp("created_at"), now), false, null));
    }
}
