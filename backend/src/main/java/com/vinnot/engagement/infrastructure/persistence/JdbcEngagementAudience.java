package com.vinnot.engagement.infrastructure.persistence;

import com.vinnot.engagement.application.model.PlanningAccount;
import com.vinnot.engagement.application.port.out.EngagementAudiencePort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * The planner's accounts (#405): active, not suspended and with a push device, read one time zone at a time in id
 * order over the {@code (timezone, id)} index, so each page costs the same however far the walk got. Planning marks
 * live in {@code engagement_planning}; a claim is a conditional upsert, so two runs never plan one account twice a day.
 */
@Component
public class JdbcEngagementAudience implements EngagementAudiencePort {
    private static final String PAGE = """
            SELECT u.id, u.created_at, device.seen_at FROM users u
            CROSS JOIN LATERAL (SELECT max(d.last_seen_at) AS seen_at FROM push_devices d WHERE d.user_id = u.id) AS device
            WHERE u.timezone = ? AND u.active AND NOT u.locked AND device.seen_at IS NOT NULL
              AND (CAST(? AS uuid) IS NULL OR u.id > CAST(? AS uuid))
              AND NOT EXISTS (SELECT 1 FROM engagement_planning p WHERE p.user_id = u.id AND p.planned_at >= ?)
            ORDER BY u.id LIMIT ?
            """;
    private static final String CLAIM = """
            INSERT INTO engagement_planning(user_id, planned_at)
            SELECT u.id, ? FROM users u WHERE u.id = ANY (?)
            ON CONFLICT (user_id) DO UPDATE SET planned_at = EXCLUDED.planned_at
            WHERE engagement_planning.planned_at < ?
            RETURNING user_id
            """;
    private final JdbcTemplate jdbc;

    public JdbcEngagementAudience(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<String> timeZones() {
        return jdbc.queryForList("SELECT DISTINCT timezone FROM users WHERE active AND NOT locked ORDER BY timezone",
                String.class);
    }

    @Override
    public List<PlanningAccount> page(String timeZone, Instant plannedBefore, UUID after, int limit) {
        return jdbc.query(PAGE, JdbcEngagementAudience::account, timeZone, after, after, Timestamp.from(plannedBefore), limit);
    }

    @Override
    public List<UUID> claim(Collection<UUID> userIds, Instant plannedBefore, Instant at) {
        if (userIds.isEmpty()) {
            return List.of();
        }
        return jdbc.queryForList(CLAIM, UUID.class, Timestamp.from(at), userIds.toArray(UUID[]::new),
                Timestamp.from(plannedBefore));
    }

    private static PlanningAccount account(ResultSet row, int index) throws SQLException {
        return new PlanningAccount(row.getObject("id", UUID.class), row.getTimestamp("created_at").toInstant(),
                row.getTimestamp("seen_at").toInstant());
    }
}
