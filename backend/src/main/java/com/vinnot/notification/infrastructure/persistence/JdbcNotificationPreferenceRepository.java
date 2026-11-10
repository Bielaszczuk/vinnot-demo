package com.vinnot.notification.infrastructure.persistence;

import com.vinnot.notification.application.port.out.NotificationPreferenceRepositoryPort;
import com.vinnot.notification.domain.model.ConsentSource;
import com.vinnot.notification.domain.model.MarketingConsent;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationChannel;
import com.vinnot.notification.domain.model.NotificationPreferences;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class JdbcNotificationPreferenceRepository implements NotificationPreferenceRepositoryPort {
    private final JdbcTemplate jdbc;

    public JdbcNotificationPreferenceRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public NotificationPreferences load(UUID userId) {
        Map<NotificationPreferences.Choice, Boolean> choices = new HashMap<>();
        jdbc.query("SELECT category, channel, enabled FROM notification_preferences WHERE user_id = ?",
                row -> {
                    choices.put(new NotificationPreferences.Choice(
                            NotificationCategory.valueOf(row.getString("category")),
                            NotificationChannel.valueOf(row.getString("channel"))), row.getBoolean("enabled"));
                }, userId);
        MarketingConsent consent = jdbc.query("""
                        SELECT granted, source, occurred_at FROM marketing_consent_events
                        WHERE user_id = ? ORDER BY occurred_at DESC, id DESC LIMIT 1
                        """,
                (row, index) -> new MarketingConsent(row.getBoolean("granted"),
                        row.getTimestamp("occurred_at").toInstant(), ConsentSource.valueOf(row.getString("source"))),
                userId).stream().findFirst().orElse(MarketingConsent.none());
        return new NotificationPreferences(choices, consent);
    }

    /** Two set-based queries for any number of accounts: their choices, and each one's latest consent event. */
    @Override
    public Map<UUID, NotificationPreferences> loadAll(Collection<UUID> userIds) {
        Map<UUID, Map<NotificationPreferences.Choice, Boolean>> choices = new HashMap<>();
        Map<UUID, MarketingConsent> consents = new HashMap<>();
        if (!userIds.isEmpty()) {
            UUID[] ids = userIds.toArray(UUID[]::new);
            jdbc.query("SELECT user_id, category, channel, enabled FROM notification_preferences WHERE user_id = ANY (?)",
                    row -> {
                        choices.computeIfAbsent(row.getObject("user_id", UUID.class), ignored -> new HashMap<>()).put(
                                new NotificationPreferences.Choice(NotificationCategory.valueOf(row.getString("category")),
                                        NotificationChannel.valueOf(row.getString("channel"))), row.getBoolean("enabled"));
                    }, (Object) ids);
            jdbc.query("""
                    SELECT DISTINCT ON (user_id) user_id, granted, source, occurred_at FROM marketing_consent_events
                    WHERE user_id = ANY (?) ORDER BY user_id, occurred_at DESC, id DESC
                    """, row -> {
                        consents.put(row.getObject("user_id", UUID.class), new MarketingConsent(row.getBoolean("granted"),
                                row.getTimestamp("occurred_at").toInstant(), ConsentSource.valueOf(row.getString("source"))));
                    }, (Object) ids);
        }
        Map<UUID, NotificationPreferences> loaded = new HashMap<>();
        userIds.forEach(userId -> loaded.put(userId, new NotificationPreferences(choices.getOrDefault(userId, Map.of()),
                consents.getOrDefault(userId, MarketingConsent.none()))));
        return loaded;
    }

    @Override
    public void saveChoices(UUID userId, Map<NotificationPreferences.Choice, Boolean> choices, Instant at) {
        choices.forEach((choice, enabled) -> jdbc.update("""
                INSERT INTO notification_preferences (user_id, category, channel, enabled, updated_at)
                SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM users WHERE id = ?)
                ON CONFLICT (user_id, category, channel)
                DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = EXCLUDED.updated_at
                """, userId, choice.category().name(), choice.channel().name(), enabled, Timestamp.from(at), userId));
    }

    @Override
    public void recordConsent(UUID userId, boolean granted, ConsentSource source, Instant at) {
        jdbc.update("INSERT INTO marketing_consent_events (id, user_id, granted, source, occurred_at) VALUES (?, ?, ?, ?, ?)",
                UUID.randomUUID(), userId, granted, source.name(), Timestamp.from(at));
    }
}
