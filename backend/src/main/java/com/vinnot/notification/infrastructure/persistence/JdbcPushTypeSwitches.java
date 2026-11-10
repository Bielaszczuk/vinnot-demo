package com.vinnot.notification.infrastructure.persistence;

import com.vinnot.notification.application.port.out.PushTypeSwitchPort;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.domain.util.EnumNames;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * {@code push_type_switches} and its audit, {@code push_type_switch_changes} (V59). Read on every delivery, so a
 * change applies to the next push without a deploy. Concurrent changes of one type are serialized on its row.
 */
@Component
public class JdbcPushTypeSwitches implements PushTypeSwitchPort {
    private final JdbcTemplate jdbc;

    public JdbcPushTypeSwitches(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean isEnabled(NotificationType type) {
        List<Boolean> stored = jdbc.queryForList(
                "SELECT enabled FROM push_type_switches WHERE notification_type = ?", Boolean.class, type.name());
        return stored.isEmpty() || stored.getFirst();
    }

    @Override
    public Set<NotificationType> disabledTypes() {
        Set<NotificationType> disabled = EnumSet.noneOf(NotificationType.class);
        jdbc.queryForList("SELECT notification_type FROM push_type_switches WHERE NOT enabled", String.class)
                .forEach(name -> EnumNames.find(NotificationType.class, name).ifPresent(disabled::add));
        return disabled;
    }

    @Override
    public Map<NotificationType, Instant> lastTurnedOn() {
        Map<NotificationType, Instant> turnedOn = new EnumMap<>(NotificationType.class);
        RowCallbackHandler collect = row -> {
            Instant at = row.getTimestamp("turned_on").toInstant();
            EnumNames.find(NotificationType.class, row.getString("notification_type")).ifPresent(type -> turnedOn.put(type, at));
        };
        jdbc.query("""
                SELECT notification_type, max(changed_at) AS turned_on FROM push_type_switch_changes
                WHERE enabled AND NOT previous_enabled GROUP BY notification_type
                """, collect);
        return turnedOn;
    }

    @Override
    @Transactional
    public boolean change(NotificationType type, boolean enabled, Actor actor, Instant at) {
        jdbc.update("""
                INSERT INTO push_type_switches(notification_type, enabled, updated_at) VALUES (?, true, ?)
                ON CONFLICT (notification_type) DO NOTHING
                """, type.name(), Timestamp.from(at));
        boolean previous = Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT enabled FROM push_type_switches WHERE notification_type = ? FOR UPDATE", Boolean.class, type.name()));
        if (previous == enabled) {
            return previous;
        }
        jdbc.update("UPDATE push_type_switches SET enabled = ?, updated_at = ?, updated_by = ? WHERE notification_type = ?",
                enabled, Timestamp.from(at), actor.id(), type.name());
        jdbc.update("""
                INSERT INTO push_type_switch_changes(notification_type, previous_enabled, enabled, changed_by,
                    changed_by_email, changed_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """, type.name(), previous, enabled, actor.id(), actor.email(), Timestamp.from(at));
        return previous;
    }

    @Override
    public List<Change> recentChanges(int limit) {
        return jdbc.query("""
                SELECT notification_type, previous_enabled, enabled, changed_by_email, changed_at
                FROM push_type_switch_changes ORDER BY changed_at DESC, id DESC LIMIT ?
                """, (row, index) -> change(row), limit)
                .stream().flatMap(Optional::stream).toList();
    }

    /** A change of a type this binary no longer knows is left out. */
    private static Optional<Change> change(ResultSet row) throws SQLException {
        String name = row.getString("notification_type");
        boolean previous = row.getBoolean("previous_enabled");
        boolean enabled = row.getBoolean("enabled");
        String changedBy = row.getString("changed_by_email");
        Instant changedAt = row.getTimestamp("changed_at").toInstant();
        return EnumNames.find(NotificationType.class, name).map(type -> new Change(type, previous, enabled, changedBy, changedAt));
    }
}
