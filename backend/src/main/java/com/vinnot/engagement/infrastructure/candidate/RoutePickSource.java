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
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * ROUTE_PICK, about every four weeks, taking turns with the winery between wines of the week: a published route of a
 * region whose routes the account viewed lately (best fit), whose recommended wine types include a type it rates
 * highly, or of a region of wines it rated highly.
 */
@Component
public class RoutePickSource implements CandidateSourcePort {
    /** Route views this recent count. */
    static final Duration VIEW_WINDOW = Duration.ofDays(60);
    private static final String SQL = """
            WITH members AS (SELECT unnest(?::uuid[]) AS user_id),
            viewed AS (
                SELECT v.user_id, lower(trim(r.region)) AS region, max(v.last_viewed_at) AS last_viewed
                FROM content_views v JOIN members m ON m.user_id = v.user_id JOIN wine_routes r ON r.id = v.entity_id
                WHERE v.kind = 'ROUTE' AND v.view_day >= ?::date AND r.region IS NOT NULL
                GROUP BY v.user_id, lower(trim(r.region))),
            types AS (
                SELECT a.user_id, a.value FROM user_taste_affinities a JOIN members m ON m.user_id = a.user_id
                WHERE a.kind = 'TYPE' AND a.rated_wines >= ? AND a.score >= ?),
            regions AS (
                SELECT DISTINCT r.user_id, lower(trim(g.name)) AS region FROM reviews r
                JOIN members m ON m.user_id = r.user_id JOIN wines w ON w.id = r.wine_id JOIN regions g ON g.id = w.region_id
                WHERE r.rating >= ? AND r.publication_status <> 'REJECTED'),
            scored AS (
                SELECT m.user_id, wr.id, wr.name, wr.region, wr.created_at, vw.last_viewed,
                       CASE WHEN vw.user_id IS NOT NULL THEN 1.0
                            WHEN EXISTS (SELECT 1 FROM types t, jsonb_array_elements_text(
                                    CASE WHEN jsonb_typeof(wr.recommended_wine_types) = 'array'
                                         THEN wr.recommended_wine_types ELSE '[]'::jsonb END) AS rt(code)
                                 WHERE t.user_id = m.user_id AND upper(trim(rt.code)) = t.value) THEN 0.8
                            WHEN EXISTS (SELECT 1 FROM regions g WHERE g.user_id = m.user_id
                                 AND g.region = lower(trim(wr.region))) THEN 0.6
                            ELSE 0 END AS fit
                FROM members m CROSS JOIN wine_routes wr
                LEFT JOIN viewed vw ON vw.user_id = m.user_id AND vw.region = lower(trim(wr.region))
                WHERE wr.status = 'PUBLISHED'
                """ + CandidateSql.notSuggested("m.user_id", "'ROUTE:' || wr.id") + """
                  AND NOT EXISTS (SELECT 1 FROM user_blocks b
                      WHERE (b.blocker_id = m.user_id AND b.blocked_id = wr.created_by)
                         OR (b.blocker_id = wr.created_by AND b.blocked_id = m.user_id)))
            SELECT DISTINCT ON (user_id) user_id, id, name, region, created_at, last_viewed, fit FROM scored WHERE fit > 0
            ORDER BY user_id, fit DESC, last_viewed DESC NULLS LAST, created_at DESC, id
            """;
    private final JdbcTemplate jdbc;

    public RoutePickSource(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public NotificationType type() {
        return NotificationType.ROUTE_PICK;
    }

    @Override
    public List<EngagementCandidate> find(CandidateQuery query) {
        if (query.members().isEmpty()) {
            return List.of();
        }
        String since = query.now().minus(VIEW_WINDOW).atZone(ZoneOffset.UTC).toLocalDate().toString();
        return jdbc.query(SQL, (row, index) -> candidate(row, query.now()), CandidateSql.ids(query.members()), since,
                CandidateSql.MIN_RATED_WINES, CandidateSql.MIN_AVERAGE, CandidateSql.LIKED_RATING);
    }

    private static EngagementCandidate candidate(ResultSet row, Instant now) throws SQLException {
        String routeId = row.getObject("id", UUID.class).toString();
        Map<String, String> data = new HashMap<>(Map.of("routeId", routeId, "route", row.getString("name")));
        String region = row.getString("region");
        if (Objects.nonNull(region) && !region.isBlank()) {
            data.put("region", region.strip());
        }
        Timestamp viewed = row.getTimestamp("last_viewed");
        return new EngagementCandidate(row.getObject("user_id", UUID.class), NotificationType.ROUTE_PICK, "ROUTE:" + routeId,
                data, new CandidateSignals(row.getDouble("fit"), CandidateSql.since(row.getTimestamp("created_at"), now),
                        Objects.nonNull(viewed), CandidateSql.since(viewed, now)));
    }
}
