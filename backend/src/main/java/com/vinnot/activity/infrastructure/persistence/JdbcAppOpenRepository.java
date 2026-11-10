package com.vinnot.activity.infrastructure.persistence;

import com.vinnot.activity.application.port.out.AppOpenRepositoryPort;
import com.vinnot.activity.domain.model.OpenHourHistogram;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class JdbcAppOpenRepository implements AppOpenRepositoryPort {
    /**
     * The conditional upsert locks the user's activity row, so concurrent opens serialise and only one of them
     * passes the gap check; the open is inserted only when the activity row moved.
     */
    private static final String RECORD_OPEN = """
            WITH moved AS (
                INSERT INTO user_activity(user_id,last_active_at) SELECT id, ? FROM users WHERE id = ?
                ON CONFLICT (user_id) DO UPDATE SET last_active_at = EXCLUDED.last_active_at
                WHERE user_activity.last_active_at <= EXCLUDED.last_active_at - (? * INTERVAL '1 second')
                RETURNING user_id, last_active_at
            )
            INSERT INTO app_opens(user_id,opened_at) SELECT user_id, last_active_at FROM moved
            ON CONFLICT DO NOTHING
            """;
    private final JdbcTemplate jdbc;

    public JdbcAppOpenRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean recordOpen(UUID userId, Instant at, Duration minimumGap) {
        return jdbc.update(RECORD_OPEN, Timestamp.from(at), userId, minimumGap.toSeconds()) > 0;
    }

    @Override
    public Map<UUID, Instant> lastActive(Collection<UUID> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, Instant> lastActive = new HashMap<>();
        RowCallbackHandler collect = row -> lastActive.put(row.getObject("user_id", UUID.class),
                row.getTimestamp("last_active_at").toInstant());
        jdbc.query("SELECT user_id, last_active_at FROM user_activity WHERE user_id = ANY (?)", collect,
                (Object) userIds.toArray(UUID[]::new));
        return lastActive;
    }

    @Override
    public Map<UUID, OpenHourHistogram> openHoursSince(Collection<UUID> userIds, Instant since) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, Map<Integer, Integer>> counts = new HashMap<>();
        RowCallbackHandler collect = row -> counts
                .computeIfAbsent(row.getObject("user_id", UUID.class), user -> new HashMap<>())
                .put(row.getInt("hour"), row.getInt("opens"));
        jdbc.query("""
                SELECT o.user_id, EXTRACT(HOUR FROM o.opened_at AT TIME ZONE u.timezone)::int AS hour, COUNT(*) AS opens
                FROM app_opens o JOIN users u ON u.id = o.user_id
                WHERE o.user_id = ANY (?) AND o.opened_at >= ?
                GROUP BY o.user_id, hour
                """, collect, userIds.toArray(UUID[]::new), Timestamp.from(since));
        Map<UUID, OpenHourHistogram> histograms = new HashMap<>();
        counts.forEach((user, hours) -> histograms.put(user, new OpenHourHistogram(hours)));
        return histograms;
    }

    @Override
    public int purgeBefore(Instant cutoff, int batchSize) {
        return jdbc.update("""
                DELETE FROM app_opens WHERE ctid IN (SELECT ctid FROM app_opens WHERE opened_at < ? LIMIT ?)
                """, Timestamp.from(cutoff), batchSize);
    }

    @Override
    public int purgeLastActiveBefore(Instant cutoff, int batchSize) {
        return jdbc.update("""
                DELETE FROM user_activity WHERE user_id IN (
                    SELECT user_id FROM user_activity WHERE last_active_at < ? LIMIT ?)
                """, Timestamp.from(cutoff), batchSize);
    }
}
