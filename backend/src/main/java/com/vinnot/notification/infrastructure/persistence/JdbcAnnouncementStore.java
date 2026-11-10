package com.vinnot.notification.infrastructure.persistence;

import com.vinnot.notification.application.model.AnnouncementRecord;
import com.vinnot.notification.application.model.AnnouncementStats;
import com.vinnot.notification.application.port.out.AnnouncementStorePort;
import com.vinnot.notification.domain.model.Announcement;
import com.vinnot.notification.domain.model.AnnouncementAudience;
import com.vinnot.notification.domain.model.AnnouncementContent;
import com.vinnot.notification.domain.model.AnnouncementDestination;
import com.vinnot.notification.domain.model.AnnouncementKind;
import com.vinnot.notification.domain.model.NotificationLocale;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * The {@code announcements} table (#310): one row per send or test, with the cursor of its batched delivery. Records are
 * read with their delivery counts from {@code announcement_delivery_stats} (#490).
 */
@Component
public class JdbcAnnouncementStore implements AnnouncementStorePort {
    private static final String COLUMNS = """
            id, kind, test, send_email, send_push, audience_language, audience_region_id, audience_country_id,
            audience_role, destination, es_title, es_body, en_title, en_body, recipients, sent_by_email, created_at,
            last_user_id, completed_at
            """;
    /** A record with its delivery counts (#490); an announcement nothing was counted for yet has no stats row. */
    private static final String RECORDS = """
            SELECT a.id, a.kind, a.test, a.send_email, a.send_push, a.audience_language, a.audience_region_id,
                a.audience_country_id, a.audience_role, a.destination, a.es_title, a.es_body, a.en_title, a.en_body,
                a.recipients, a.sent_by_email, a.created_at, a.last_user_id, a.completed_at,
                COALESCE(s.emails_sent, 0) AS emails_sent, COALESCE(s.emails_failed, 0) AS emails_failed,
                COALESCE(s.pushes_sent, 0) AS pushes_sent, COALESCE(s.pushes_failed, 0) AS pushes_failed,
                COALESCE(s.pushes_opened, 0) AS pushes_opened
            FROM announcements a LEFT JOIN announcement_delivery_stats s ON s.announcement_id = a.id
            """;
    private final JdbcTemplate jdbc;

    public JdbcAnnouncementStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean save(UUID id, Announcement announcement, boolean test, int recipients, Sender sender, Instant at) {
        AnnouncementAudience audience = announcement.audience();
        Optional<AnnouncementContent> es = Optional.ofNullable(announcement.versions().get(NotificationLocale.ES));
        Optional<AnnouncementContent> en = Optional.ofNullable(announcement.versions().get(NotificationLocale.EN));
        Timestamp created = Timestamp.from(at);
        return jdbc.update("""
                INSERT INTO announcements (id, kind, test, send_email, send_push, audience_language, audience_region_id,
                    audience_country_id, audience_role, destination, es_title, es_body, en_title, en_body, recipients,
                    sent_by, sent_by_email, created_at, completed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO NOTHING
                """, id, announcement.kind().name(), test, audience.email(), audience.push(), audience.language(),
                audience.regionId(), audience.countryId(), audience.role(), announcement.destination().name(),
                es.map(AnnouncementContent::title).orElse(null), es.map(AnnouncementContent::body).orElse(null),
                en.map(AnnouncementContent::title).orElse(null), en.map(AnnouncementContent::body).orElse(null),
                recipients, sender.id(), sender.email(), created, test ? created : null) > 0;
    }

    @Override
    public Optional<AnnouncementRecord> find(UUID id) {
        return jdbc.query(RECORDS + " WHERE a.id = ?", JdbcAnnouncementStore::record, id)
                .stream().findFirst();
    }

    @Override
    public Optional<Pending> lockNextPending() {
        return jdbc.query("SELECT " + COLUMNS + " FROM announcements WHERE completed_at IS NULL AND NOT test"
                        + " ORDER BY created_at, id LIMIT 1 FOR UPDATE SKIP LOCKED",
                (row, index) -> new Pending(row.getObject("id", UUID.class), announcement(row),
                        row.getObject("last_user_id", UUID.class))).stream().findFirst();
    }

    @Override
    public void advance(UUID id, UUID lastUserId, Instant completedAt) {
        jdbc.update("UPDATE announcements SET last_user_id = ?, completed_at = ? WHERE id = ?", lastUserId,
                Objects.isNull(completedAt) ? null : Timestamp.from(completedAt), id);
    }

    @Override
    public List<AnnouncementRecord> recent(int limit) {
        return jdbc.query(RECORDS + " ORDER BY a.created_at DESC, a.id DESC LIMIT ?",
                JdbcAnnouncementStore::record, limit);
    }

    private static AnnouncementRecord record(ResultSet row, int index) throws SQLException {
        Announcement announcement = announcement(row);
        Timestamp completed = row.getTimestamp("completed_at");
        return new AnnouncementRecord(row.getObject("id", UUID.class), announcement.kind(), row.getBoolean("test"),
                announcement.audience(), announcement.destination(), announcement.headline(), row.getInt("recipients"),
                row.getString("sent_by_email"), row.getTimestamp("created_at").toInstant(),
                Objects.isNull(completed) ? null : completed.toInstant(),
                new AnnouncementStats(row.getLong("emails_sent"), row.getLong("emails_failed"), row.getLong("pushes_sent"),
                        row.getLong("pushes_failed"), row.getLong("pushes_opened")));
    }

    private static Announcement announcement(ResultSet row) throws SQLException {
        Map<NotificationLocale, AnnouncementContent> versions = new EnumMap<>(NotificationLocale.class);
        version(row, "es", NotificationLocale.ES, versions);
        version(row, "en", NotificationLocale.EN, versions);
        AnnouncementAudience audience = new AnnouncementAudience(row.getBoolean("send_email"), row.getBoolean("send_push"),
                row.getString("audience_language"), row.getObject("audience_region_id", UUID.class),
                row.getObject("audience_country_id", UUID.class),
                row.getString("audience_role"));
        return new Announcement(AnnouncementKind.valueOf(row.getString("kind")), versions, audience,
                AnnouncementDestination.valueOf(row.getString("destination")));
    }

    private static void version(ResultSet row, String prefix, NotificationLocale locale,
            Map<NotificationLocale, AnnouncementContent> versions) throws SQLException {
        String title = row.getString(prefix + "_title");
        if (Objects.nonNull(title)) {
            versions.put(locale, new AnnouncementContent(title, row.getString(prefix + "_body")));
        }
    }
}
