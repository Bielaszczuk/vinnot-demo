package com.vinnot.notification.infrastructure.persistence;

import com.vinnot.notification.application.model.PushOpen;
import com.vinnot.notification.application.port.out.PushOpenStorePort;
import com.vinnot.notification.domain.model.NotificationType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Arrays;
import java.util.Collection;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Component
public class JdbcPushOpenStore implements PushOpenStorePort {
    private final JdbcTemplate jdbc;

    public JdbcPushOpenStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean save(UUID userId, String ref, NotificationType type, Instant openedAt) {
        return jdbc.update("""
                INSERT INTO push_opens(user_id,ref,type,opened_at) SELECT id, ?, ?, ? FROM users WHERE id = ?
                ON CONFLICT (user_id,ref) DO NOTHING
                """, ref, type.name(), Timestamp.from(openedAt), userId) > 0;
    }

    @Override
    public List<PushOpen> findSince(Collection<UUID> userIds, Set<NotificationType> types, Instant since) {
        if (userIds.isEmpty() || types.isEmpty()) {
            return List.of();
        }
        return jdbc.query("""
                SELECT user_id, ref, type, opened_at FROM push_opens
                WHERE user_id = ANY (?) AND type = ANY (?) AND opened_at >= ?
                ORDER BY opened_at DESC, user_id, ref
                """, (row, index) -> new PushOpen(row.getObject("user_id", UUID.class), row.getString("ref"),
                        NotificationType.valueOf(row.getString("type")), row.getTimestamp("opened_at").toInstant()),
                userIds.toArray(UUID[]::new), types.stream().map(Enum::name).toArray(String[]::new),
                Timestamp.from(since));
    }

    @Override
    public Map<NotificationType, Long> countByTypeSince(Instant since) {
        Map<NotificationType, Long> counts = new EnumMap<>(NotificationType.class);
        RowCallbackHandler collect = row -> {
            long opens = row.getLong("opens");
            known(row.getString("type")).ifPresent(type -> counts.put(type, opens));
        };
        jdbc.query("SELECT type, COUNT(*) AS opens FROM push_opens WHERE opened_at >= ? GROUP BY type", collect,
                Timestamp.from(since));
        return counts;
    }

    private static Optional<NotificationType> known(String type) {
        return Arrays.stream(NotificationType.values()).filter(value -> value.name().equals(type)).findFirst();
    }
}
