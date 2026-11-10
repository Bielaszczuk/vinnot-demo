package com.vinnot.notification.infrastructure.persistence;

import com.vinnot.notification.application.model.AnnouncementReach;
import com.vinnot.notification.application.port.out.AnnouncementAudiencePort;
import com.vinnot.notification.domain.model.AnnouncementAudience;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationChannel;
import com.vinnot.notification.domain.model.NotificationLocale;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * The announcement audience (#310) in one query shared by the count and the batches, so the number the administrator
 * confirms is the one delivery walks. Suppressed addresses match by the same fingerprint
 * {@link JdbcEmailSuppressionRepository} stores, and consent is the latest consent event, as preferences read it.
 * Like the preferences, promotions reach accounts that never decided and skip a revoked consent or a channel turned off.
 */
@Component
public class JdbcAnnouncementAudience implements AnnouncementAudiencePort {
    private static final String ELIGIBLE = """
            SELECT u.id, u.preferred_language,
                   u.email_verified
                   AND NOT EXISTS (SELECT 1 FROM email_suppressions s
                                   WHERE s.address_hash = encode(sha256(convert_to(lower(btrim(u.email)), 'UTF8')), 'hex'))
                   AND (NOT :promotional OR (consent.granted AND NOT EXISTS (
                        SELECT 1 FROM notification_preferences p WHERE p.user_id = u.id AND p.category = :category
                          AND p.channel = :emailChannel AND NOT p.enabled))) AS by_email,
                   EXISTS (SELECT 1 FROM push_devices d WHERE d.user_id = u.id)
                   AND (NOT :promotional OR (consent.granted AND NOT EXISTS (
                        SELECT 1 FROM notification_preferences p WHERE p.user_id = u.id AND p.category = :category
                          AND p.channel = :pushChannel AND NOT p.enabled))) AS by_push
            FROM users u
            CROSS JOIN LATERAL (SELECT COALESCE((SELECT m.granted FROM marketing_consent_events m WHERE m.user_id = u.id
                                                 ORDER BY m.occurred_at DESC, m.id DESC LIMIT 1), true) AS granted) consent
            WHERE u.active AND NOT u.locked
              AND (CAST(:language AS varchar) IS NULL OR u.preferred_language = CAST(:language AS varchar))
              AND ((CAST(:region AS uuid) IS NULL AND CAST(:country AS uuid) IS NULL) OR EXISTS (
                    SELECT 1 FROM user_event_areas a JOIN regions g ON g.id = a.region_id
                    WHERE a.user_id = u.id
                      AND (CAST(:region AS uuid) IS NULL OR a.region_id = CAST(:region AS uuid))
                      AND (CAST(:country AS uuid) IS NULL OR g.country_id = CAST(:country AS uuid))))
              AND (CAST(:role AS varchar) IS NULL OR EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
                                                           WHERE ur.user_id = u.id AND r.name = CAST(:role AS varchar)))
            """;
    private static final String REACHED = "((:email AND e.by_email) OR (:push AND e.by_push))";
    private final NamedParameterJdbcTemplate jdbc;

    public JdbcAnnouncementAudience(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public AnnouncementReach count(AnnouncementAudience audience, boolean promotional) {
        return jdbc.queryForObject("SELECT count(*) FILTER (WHERE :email AND e.by_email) AS email,"
                        + " count(*) FILTER (WHERE :push AND e.by_push) AS push, count(*) AS accounts"
                        + " FROM (" + ELIGIBLE + ") e WHERE " + REACHED,
                parameters(audience, promotional), JdbcAnnouncementAudience::reach);
    }

    @Override
    public List<Recipient> after(AnnouncementAudience audience, boolean promotional, UUID after, int limit) {
        MapSqlParameterSource parameters = parameters(audience, promotional).addValue("after", after).addValue("limit", limit);
        return jdbc.query("SELECT e.id, e.preferred_language, e.by_email, e.by_push FROM (" + ELIGIBLE + ") e WHERE "
                + REACHED + " AND (CAST(:after AS uuid) IS NULL OR e.id > CAST(:after AS uuid)) ORDER BY e.id LIMIT :limit",
                parameters, JdbcAnnouncementAudience::recipient);
    }

    private static MapSqlParameterSource parameters(AnnouncementAudience audience, boolean promotional) {
        return new MapSqlParameterSource()
                .addValue("promotional", promotional)
                .addValue("category", NotificationCategory.NEWSLETTER.name())
                .addValue("emailChannel", NotificationChannel.EMAIL.name())
                .addValue("pushChannel", NotificationChannel.PUSH.name())
                .addValue("email", audience.email())
                .addValue("push", audience.push())
                .addValue("language", audience.language())
                .addValue("region", audience.regionId())
                .addValue("country", audience.countryId())
                .addValue("role", roleName(audience.role()));
    }

    private static String roleName(String role) {
        return Objects.isNull(role) ? null : "ROLE_" + role;
    }

    private static AnnouncementReach reach(ResultSet row, int index) throws SQLException {
        return new AnnouncementReach(row.getInt("email"), row.getInt("push"), row.getInt("accounts"));
    }

    private static Recipient recipient(ResultSet row, int index) throws SQLException {
        return new Recipient(row.getObject("id", UUID.class), NotificationLocale.fromLanguage(row.getString("preferred_language")),
                row.getBoolean("by_email"), row.getBoolean("by_push"));
    }
}
