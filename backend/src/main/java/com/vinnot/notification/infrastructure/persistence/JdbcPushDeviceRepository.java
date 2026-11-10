package com.vinnot.notification.infrastructure.persistence;

import com.vinnot.notification.application.port.out.PushDeviceRepositoryPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.PushDevice;
import com.vinnot.notification.domain.model.PushPlatform;
import com.vinnot.notification.domain.model.PushToken;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Component
public class JdbcPushDeviceRepository implements PushDeviceRepositoryPort {
    private final JdbcTemplate jdbc;

    public JdbcPushDeviceRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void save(PushDevice device) {
        jdbc.update("""
                INSERT INTO push_devices(token,user_id,platform,locale,created_at,last_seen_at,channels) VALUES (?,?,?,?,?,?,?)
                ON CONFLICT (token) DO UPDATE SET user_id=EXCLUDED.user_id, platform=EXCLUDED.platform,
                    locale=EXCLUDED.locale, last_seen_at=EXCLUDED.last_seen_at, channels=EXCLUDED.channels
                """, device.token().value(), device.userId(), device.platform().name(), device.locale().language(),
                Timestamp.from(device.lastSeenAt()), Timestamp.from(device.lastSeenAt()), device.channels());
    }

    @Override
    public void delete(UUID userId, PushToken token) {
        jdbc.update("DELETE FROM push_devices WHERE user_id=? AND token=?", userId, token.value());
    }

    @Override
    public void deleteAll(UUID userId) {
        jdbc.update("DELETE FROM push_devices WHERE user_id=?", userId);
    }

    @Override
    public void deleteTokens(Collection<String> tokens) {
        if (tokens.isEmpty()) {
            return;
        }
        jdbc.update("DELETE FROM push_devices WHERE token = ANY (?)",
                (Object) tokens.toArray(String[]::new));
    }

    @Override
    public int deleteNotSeenSince(Instant cutoff) {
        return jdbc.update("DELETE FROM push_devices WHERE last_seen_at < ?", Timestamp.from(cutoff));
    }

    @Override
    public List<PushDevice> findByUsers(Collection<UUID> userIds) {
        if (userIds.isEmpty()) {
            return List.of();
        }
        return jdbc.query("""
                SELECT token,user_id,platform,locale,last_seen_at,channels FROM push_devices WHERE user_id = ANY (?)
                ORDER BY user_id, last_seen_at DESC
                """, (row, index) -> new PushDevice(row.getObject("user_id", UUID.class), new PushToken(row.getString("token")),
                        PushPlatform.valueOf(row.getString("platform")), NotificationLocale.fromLanguage(row.getString("locale")),
                        row.getTimestamp("last_seen_at").toInstant(), row.getBoolean("channels")),
                (Object) userIds.toArray(UUID[]::new));
    }
}
