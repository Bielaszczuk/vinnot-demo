package com.vinnot.wine.infrastructure.recommendation;

import com.vinnot.wine.application.port.out.TasteAffinityStore;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;

/**
 * Recomputes the whole table in two statements. A wine's own review wins over its cellar rating; a grape listed twice
 * on one wine counts once; the label is the most common spelling of the grape. The caller's transaction holds a
 * transaction-scoped advisory lock (#405): when another instance is already recomputing, this run does nothing instead
 * of racing it, and readers such as the engagement planner keep seeing the previous table until the new one commits.
 */
@Component
@RequiredArgsConstructor
public class JdbcTasteAffinityStore implements TasteAffinityStore {
    /** Keys of the recompute's advisory lock, distinct from every other advisory lock of the application. */
    static final int LOCK_NAMESPACE = 405_306;
    static final int LOCK_KEY = 1;
    private final JdbcTemplate jdbc;

    @Override
    public int recompute(Instant computedAt) {
        Boolean locked = jdbc.queryForObject("SELECT pg_try_advisory_xact_lock(?, ?)", Boolean.class, LOCK_NAMESPACE, LOCK_KEY);
        if (!Boolean.TRUE.equals(locked)) {
            return 0;
        }
        jdbc.update("DELETE FROM user_taste_affinities");
        Timestamp at = Timestamp.from(computedAt);
        return jdbc.update("""
                WITH rated AS (
                    SELECT r.user_id, r.wine_id, r.rating::numeric AS rating FROM reviews r
                    WHERE r.publication_status <> 'REJECTED'
                    UNION ALL
                    SELECT c.user_id, c.wine_id, c.rating_decimal::numeric FROM cellar_wines c
                    WHERE c.rating_decimal IS NOT NULL AND NOT EXISTS (
                        SELECT 1 FROM reviews r WHERE r.user_id = c.user_id AND r.wine_id = c.wine_id
                        AND r.publication_status <> 'REJECTED')
                ), grapes AS (
                    SELECT DISTINCT ON (rated.user_id, rated.wine_id, lower(trim(g.name)))
                        rated.user_id, rated.rating, lower(trim(g.name)) AS value, trim(g.name) AS label
                    FROM rated JOIN wines w ON w.id = rated.wine_id
                    CROSS JOIN LATERAL jsonb_array_elements_text(
                        CASE WHEN jsonb_typeof(w.grapes) = 'array' THEN w.grapes ELSE '[]'::jsonb END) g(name)
                    WHERE trim(g.name) <> '' AND length(trim(g.name)) <= 120
                )
                INSERT INTO user_taste_affinities(user_id, kind, value, label, score, rated_wines, computed_at)
                SELECT user_id, 'GRAPE', value, mode() WITHIN GROUP (ORDER BY label), round(avg(rating), 2), count(*), ?::timestamptz
                FROM grapes GROUP BY user_id, value
                UNION ALL
                SELECT rated.user_id, 'TYPE', upper(trim(w.wine_type)), upper(trim(w.wine_type)), round(avg(rated.rating), 2), count(*), ?::timestamptz
                FROM rated JOIN wines w ON w.id = rated.wine_id GROUP BY rated.user_id, upper(trim(w.wine_type))
                """, at, at);
    }
}
