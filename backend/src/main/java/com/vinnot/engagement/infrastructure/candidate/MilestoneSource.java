package com.vinnot.engagement.infrastructure.candidate;

import com.vinnot.engagement.application.model.CandidateQuery;
import com.vinnot.engagement.application.port.out.CandidateSourcePort;
import com.vinnot.engagement.domain.model.CandidateSignals;
import com.vinnot.engagement.domain.model.EngagementCandidate;
import com.vinnot.notification.domain.model.NotificationType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Component;

import java.sql.Array;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * MILESTONE, when it happens: the likes the account's reviews received (from others) or the wines it reviewed crossed
 * a milestone in the last week, and that milestone was never celebrated. Likes come first; the highest milestone
 * crossed wins, so an account that jumped two never gets two pushes. Old milestones are never celebrated late.
 */
@Component
public class MilestoneSource implements CandidateSourcePort {
    static final List<Integer> LIKES = List.of(10, 25, 50, 100, 250, 500, 1000);
    static final List<Integer> RATED = List.of(5, 10, 25, 50, 100, 250, 500);
    /** A milestone crossed within this window is still news. */
    static final Duration RECENT = Duration.ofDays(7);
    private static final String SQL = """
            WITH members AS (SELECT unnest(?::uuid[]) AS user_id),
            likes AS (
                SELECT r.user_id, count(*) AS total, count(*) FILTER (WHERE l.created_at <= ?) AS before
                FROM review_likes l JOIN reviews r ON r.id = l.review_id JOIN members m ON m.user_id = r.user_id
                WHERE l.user_id <> r.user_id GROUP BY r.user_id),
            rated AS (
                SELECT r.user_id, count(*) AS total, count(*) FILTER (WHERE r.created_at <= ?) AS before
                FROM reviews r JOIN members m ON m.user_id = r.user_id
                WHERE r.publication_status <> 'REJECTED' GROUP BY r.user_id)
            SELECT m.user_id, coalesce(lk.total, 0) AS likes, coalesce(lk.before, 0) AS likes_before,
                   coalesce(rt.total, 0) AS rated, coalesce(rt.before, 0) AS rated_before,
                   (SELECT r.wine_id FROM reviews r WHERE r.user_id = m.user_id
                    ORDER BY r.likes_count DESC, r.created_at DESC LIMIT 1) AS top_wine,
                   ARRAY(SELECT s.content_ref FROM engagement_sends s
                         WHERE s.user_id = m.user_id AND s.content_ref LIKE 'MILESTONE:%') AS celebrated
            FROM members m LEFT JOIN likes lk ON lk.user_id = m.user_id LEFT JOIN rated rt ON rt.user_id = m.user_id
            WHERE lk.user_id IS NOT NULL OR rt.user_id IS NOT NULL
            """;
    private final JdbcTemplate jdbc;

    public MilestoneSource(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public NotificationType type() {
        return NotificationType.MILESTONE;
    }

    @Override
    public List<EngagementCandidate> find(CandidateQuery query) {
        if (query.members().isEmpty()) {
            return List.of();
        }
        Timestamp weekAgo = Timestamp.from(query.now().minus(RECENT));
        List<EngagementCandidate> candidates = new ArrayList<>();
        RowCallbackHandler collect = row -> {
            UUID user = row.getObject("user_id", UUID.class);
            Set<String> celebrated = refs(row.getArray("celebrated"));
            Optional<Integer> likes = crossed(LIKES, row.getLong("likes_before"), row.getLong("likes"), "LIKES", celebrated);
            Optional<Integer> rated = crossed(RATED, row.getLong("rated_before"), row.getLong("rated"), "RATED", celebrated);
            String kind = likes.isPresent() ? "LIKES" : "RATED";
            Optional<Integer> milestone = likes.or(() -> rated);
            if (milestone.isEmpty()) {
                return;
            }
            Map<String, String> data = new HashMap<>(Map.of("kind", kind, "count", milestone.get().toString()));
            UUID wine = row.getObject("top_wine", UUID.class);
            if ("LIKES".equals(kind) && Objects.nonNull(wine)) {
                data.put("wineId", wine.toString());
            }
            candidates.add(new EngagementCandidate(user, NotificationType.MILESTONE, "MILESTONE:" + kind + ":" + milestone.get(),
                    data, CandidateSignals.fit(1)));
        };
        jdbc.query(SQL, collect, CandidateSql.ids(query.members()), weekAgo, weekAgo);
        return candidates;
    }

    /** The highest milestone in (before, total] not celebrated yet. */
    static Optional<Integer> crossed(List<Integer> milestones, long before, long total, String kind, Set<String> celebrated) {
        return milestones.stream().filter(milestone -> before < milestone && milestone <= total)
                .filter(milestone -> !celebrated.contains("MILESTONE:" + kind + ":" + milestone))
                .reduce((lower, higher) -> higher);
    }

    private static Set<String> refs(Array array) throws SQLException {
        return Objects.isNull(array) ? Set.of() : new HashSet<>(Arrays.asList((String[]) array.getArray()));
    }
}
