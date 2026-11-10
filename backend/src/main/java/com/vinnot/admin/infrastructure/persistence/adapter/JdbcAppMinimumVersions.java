package com.vinnot.admin.infrastructure.persistence.adapter;

import com.vinnot.admin.application.port.out.AppMinimumVersionPort;
import com.vinnot.admin.domain.model.AppPlatform;
import com.vinnot.admin.domain.model.AppVersion;
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
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * {@code app_minimum_versions} and its audit, {@code app_minimum_version_changes} (V69). Read on every policy request,
 * so a change applies to the next app launch without a deploy. Concurrent changes of one platform are serialized on
 * its row. Rows of a platform this binary no longer knows are left out.
 */
@Component
public class JdbcAppMinimumVersions implements AppMinimumVersionPort {
    private final JdbcTemplate jdbc;

    public JdbcAppMinimumVersions(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Map<AppPlatform, AppVersion> minimumVersions() {
        Map<AppPlatform, AppVersion> minimums = new EnumMap<>(AppPlatform.class);
        RowCallbackHandler collect = row -> {
            AppVersion version = AppVersion.parse(row.getString("minimum_version"));
            EnumNames.find(AppPlatform.class, row.getString("platform")).ifPresent(platform -> minimums.put(platform, version));
        };
        jdbc.query("SELECT platform, minimum_version FROM app_minimum_versions WHERE minimum_version IS NOT NULL", collect);
        return minimums;
    }

    @Override
    public Map<AppPlatform, Setting> settings() {
        Map<AppPlatform, Setting> settings = new EnumMap<>(AppPlatform.class);
        RowCallbackHandler collect = row -> setting(row).ifPresent(setting -> settings.put(setting.platform(), setting));
        // The last changer's email comes from the audit, so it stays readable after the account is gone.
        jdbc.query("""
                SELECT v.platform, v.minimum_version, v.updated_at,
                    (SELECT c.changed_by_email FROM app_minimum_version_changes c WHERE c.platform = v.platform
                     ORDER BY c.changed_at DESC, c.id DESC LIMIT 1) AS updated_by_email
                FROM app_minimum_versions v
                """, collect);
        return settings;
    }

    @Override
    @Transactional
    public Optional<AppVersion> change(AppPlatform platform, AppVersion minimumVersion, Actor actor, Instant at) {
        jdbc.update("INSERT INTO app_minimum_versions(platform) VALUES (?) ON CONFLICT (platform) DO NOTHING", platform.name());
        String previous = jdbc.queryForObject(
                "SELECT minimum_version FROM app_minimum_versions WHERE platform = ? FOR UPDATE", String.class, platform.name());
        String next = Objects.isNull(minimumVersion) ? null : minimumVersion.toString();
        Optional<AppVersion> before = AppVersion.parseOptional(previous);
        if (Objects.equals(before.orElse(null), minimumVersion)) {
            return before;
        }
        jdbc.update("UPDATE app_minimum_versions SET minimum_version = ?, updated_at = ?, updated_by = ? WHERE platform = ?",
                next, Timestamp.from(at), actor.id(), platform.name());
        jdbc.update("""
                INSERT INTO app_minimum_version_changes(platform, previous_minimum_version, minimum_version, changed_by,
                    changed_by_email, changed_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """, platform.name(), before.map(AppVersion::toString).orElse(null), next, actor.id(), actor.email(),
                Timestamp.from(at));
        return before;
    }

    @Override
    public List<Change> recentChanges(int limit) {
        return jdbc.query("""
                SELECT platform, previous_minimum_version, minimum_version, changed_by_email, changed_at
                FROM app_minimum_version_changes ORDER BY changed_at DESC, id DESC LIMIT ?
                """, (row, index) -> change(row), limit)
                .stream().flatMap(Optional::stream).toList();
    }

    private static Optional<Setting> setting(ResultSet row) throws SQLException {
        AppVersion version = AppVersion.parseOptional(row.getString("minimum_version")).orElse(null);
        Timestamp updatedAt = row.getTimestamp("updated_at");
        String updatedBy = row.getString("updated_by_email");
        return EnumNames.find(AppPlatform.class, row.getString("platform")).map(platform -> new Setting(platform, version,
                Objects.isNull(updatedAt) ? null : updatedAt.toInstant(), updatedBy));
    }

    private static Optional<Change> change(ResultSet row) throws SQLException {
        AppVersion previous = AppVersion.parseOptional(row.getString("previous_minimum_version")).orElse(null);
        AppVersion version = AppVersion.parseOptional(row.getString("minimum_version")).orElse(null);
        String changedBy = row.getString("changed_by_email");
        Instant changedAt = row.getTimestamp("changed_at").toInstant();
        return EnumNames.find(AppPlatform.class, row.getString("platform"))
                .map(platform -> new Change(platform, previous, version, changedBy, changedAt));
    }
}
