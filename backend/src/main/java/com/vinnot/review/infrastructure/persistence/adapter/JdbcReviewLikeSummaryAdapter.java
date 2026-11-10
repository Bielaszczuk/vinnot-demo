package com.vinnot.review.infrastructure.persistence.adapter;

import com.vinnot.review.application.port.out.ReviewLikeSummaryPort;
import com.vinnot.review.domain.model.LikeSummaryCadence;
import com.vinnot.shared.infrastructure.persistence.CoverageCursor;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/** Reads the likes directly; each cadence's window comes from its row of a {@link CoverageCursor}. */
@Component
@RequiredArgsConstructor
public class JdbcReviewLikeSummaryAdapter implements ReviewLikeSummaryPort {
    private static final CoverageCursor CURSOR = new CoverageCursor("review_like_summary_cursor", "cadence");
    private final JdbcTemplate jdbc;

    @Override
    public Window claim(LikeSummaryCadence cadence, Instant now) {
        CoverageCursor.Window window = CURSOR.claim(jdbc, cadence.name(), now);
        return new Window(window.from(), window.to());
    }

    @Override
    public List<AuthorLikes> likesIn(Window window) {
        return jdbc.query("""
                WITH counted AS (
                    SELECT r.user_id AS author_id, r.id AS review_id, r.wine_id, count(*) AS likes,
                           min(l.user_id::text) AS liker_id
                    FROM review_likes l
                    JOIN reviews r ON r.id = l.review_id
                    JOIN wines w ON w.id = r.wine_id AND w.is_active
                    WHERE l.created_at > ? AND l.created_at <= ?
                      AND l.user_id <> r.user_id
                      AND r.publication_status = 'APPROVED'
                      AND NOT EXISTS (SELECT 1 FROM user_blocks b
                                      WHERE (b.blocker_id = r.user_id AND b.blocked_id = l.user_id)
                                         OR (b.blocker_id = l.user_id AND b.blocked_id = r.user_id))
                    GROUP BY r.user_id, r.id, r.wine_id
                ), ranked AS (
                    SELECT c.*, sum(c.likes) OVER (PARTITION BY c.author_id) AS total,
                           count(*) OVER (PARTITION BY c.author_id) AS reviews,
                           row_number() OVER (PARTITION BY c.author_id ORDER BY c.likes DESC, c.review_id) AS position
                    FROM counted c
                )
                SELECT k.author_id, k.total, k.reviews, k.wine_id, w.name AS wine_name,
                       CASE WHEN k.total = 1 THEN k.liker_id END AS liker_id
                FROM ranked k
                JOIN wines w ON w.id = k.wine_id
                WHERE k.position = 1
                ORDER BY k.author_id
                """, (row, index) -> new AuthorLikes(row.getObject("author_id", UUID.class), row.getInt("total"),
                        row.getInt("reviews"), row.getObject("wine_id", UUID.class), row.getString("wine_name"),
                        uuid(row.getString("liker_id"))),
                Timestamp.from(window.from()), Timestamp.from(window.to()));
    }

    private static UUID uuid(String value) {
        return Objects.isNull(value) ? null : UUID.fromString(value);
    }
}
