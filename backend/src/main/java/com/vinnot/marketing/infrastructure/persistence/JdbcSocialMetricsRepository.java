package com.vinnot.marketing.infrastructure.persistence;

import com.vinnot.marketing.application.port.out.SocialMetricsRepository;
import com.vinnot.marketing.domain.model.PillarPerformance;
import com.vinnot.marketing.domain.model.PublicationMetrics;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The {@code social_post_metrics} table (#510): one snapshot per publication and day, the latest of each publication,
 * and each pillar's totals for the planner's weighting.
 */
@Component
public class JdbcSocialMetricsRepository implements SocialMetricsRepository {
    private static final String METRICS = "views, reach, likes, comments, saves, shares, follows";
    private final JdbcTemplate jdbc;

    public JdbcSocialMetricsRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void saveSnapshot(UUID publicationId, LocalDate day, PublicationMetrics metrics, Instant capturedAt) {
        jdbc.update("""
                INSERT INTO social_post_metrics (publication_id, captured_on, %s, captured_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (publication_id, captured_on) DO UPDATE SET views = EXCLUDED.views, reach = EXCLUDED.reach,
                    likes = EXCLUDED.likes, comments = EXCLUDED.comments, saves = EXCLUDED.saves, shares = EXCLUDED.shares,
                    follows = EXCLUDED.follows, captured_at = EXCLUDED.captured_at
                """.formatted(METRICS), publicationId, Date.valueOf(day), metrics.views(), metrics.reach(), metrics.likes(),
                metrics.comments(), metrics.saves(), metrics.shares(), metrics.follows(), Timestamp.from(capturedAt));
    }

    @Override
    public Map<UUID, PublicationMetrics> latestByPublication(Collection<UUID> publicationIds) {
        if (publicationIds.isEmpty()) {
            return Map.of();
        }
        String placeholders = String.join(", ", Collections.nCopies(publicationIds.size(), "?"));
        Map<UUID, PublicationMetrics> latest = new HashMap<>();
        jdbc.query("SELECT DISTINCT ON (publication_id) publication_id, " + METRICS + " FROM social_post_metrics WHERE publication_id IN ("
                + placeholders + ") ORDER BY publication_id, captured_on DESC", (ResultSet row) -> {
                    latest.put(row.getObject("publication_id", UUID.class), metrics(row));
                }, publicationIds.toArray());
        return latest;
    }

    /**
     * Sums, per pillar of the post, the latest snapshot of every publication published from {@code since} on; a post is
     * measured when any snapshot of its publications has views.
     */
    @Override
    public List<PillarPerformance> pillarPerformance(Instant since) {
        return jdbc.query("""
                WITH latest AS (
                    SELECT DISTINCT ON (publication_id) publication_id, views, likes, comments, saves, shares
                    FROM social_post_metrics ORDER BY publication_id, captured_on DESC),
                measured AS (
                    SELECT DISTINCT publications.post_id FROM social_post_metrics metrics
                    JOIN social_publications publications ON publications.id = metrics.publication_id WHERE metrics.views IS NOT NULL)
                SELECT posts.pillar_code, COUNT(DISTINCT measured.post_id) AS measured_posts, COALESCE(SUM(latest.views), 0) AS views,
                    COALESCE(SUM(COALESCE(latest.likes, 0) + COALESCE(latest.comments, 0) + COALESCE(latest.saves, 0)
                        + COALESCE(latest.shares, 0)), 0) AS interactions
                FROM latest
                JOIN social_publications publications ON publications.id = latest.publication_id
                JOIN social_posts posts ON posts.id = publications.post_id
                LEFT JOIN measured ON measured.post_id = posts.id
                WHERE publications.published_at >= ?
                GROUP BY posts.pillar_code ORDER BY posts.pillar_code
                """, (row, index) -> new PillarPerformance(row.getString("pillar_code"), row.getInt("measured_posts"), row.getLong("views"),
                row.getLong("interactions")), Timestamp.from(since));
    }

    private static PublicationMetrics metrics(ResultSet row) throws SQLException {
        return new PublicationMetrics(number(row, "views"), number(row, "reach"), number(row, "likes"), number(row, "comments"),
                number(row, "saves"), number(row, "shares"), number(row, "follows"));
    }

    private static Long number(ResultSet row, String column) throws SQLException {
        return row.getObject(column, Long.class);
    }
}
