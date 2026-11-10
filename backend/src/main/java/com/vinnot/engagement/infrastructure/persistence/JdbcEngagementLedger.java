package com.vinnot.engagement.infrastructure.persistence;

import com.vinnot.engagement.application.model.LedgerEntry;
import com.vinnot.engagement.application.port.out.EngagementLedgerPort;
import com.vinnot.shared.domain.util.EnumNames;
import com.vinnot.notification.domain.model.NotificationType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * {@code engagement_sends} (V67). The latest rows per account come from one lateral query over the
 * {@code (user_id, sent_at)} index; writes are one JDBC batch and skip accounts deleted meanwhile.
 */
@Component
public class JdbcEngagementLedger implements EngagementLedgerPort {
    private static final String RECENT = """
            SELECT recent.* FROM unnest(?::uuid[]) AS account(id)
            CROSS JOIN LATERAL (
                SELECT s.user_id, s.notification_type, s.dedupe_key, s.content_ref, s.sent_at, s.holdout
                FROM engagement_sends s WHERE s.user_id = account.id ORDER BY s.sent_at DESC LIMIT ?) AS recent
            """;
    private static final String INSERT = """
            INSERT INTO engagement_sends(user_id, dedupe_key, notification_type, content_ref, sent_at, holdout)
            SELECT CAST(? AS uuid), ?, ?, CAST(? AS varchar), ?, ? WHERE EXISTS (SELECT 1 FROM users WHERE id = CAST(? AS uuid))
            ON CONFLICT (user_id, dedupe_key) DO NOTHING
            """;
    private final JdbcTemplate jdbc;

    public JdbcEngagementLedger(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Map<UUID, List<LedgerEntry>> recent(Collection<UUID> userIds, int perAccount) {
        Map<UUID, List<LedgerEntry>> recent = new HashMap<>();
        if (userIds.isEmpty()) {
            return recent;
        }
        RowCallbackHandler collect = row -> entry(row)
                .ifPresent(entry -> recent.computeIfAbsent(entry.userId(), id -> new ArrayList<>()).add(entry));
        jdbc.query(RECENT, collect, userIds.toArray(UUID[]::new), perAccount);
        return recent;
    }

    @Override
    public void record(List<LedgerEntry> entries) {
        if (entries.isEmpty()) {
            return;
        }
        List<Object[]> rows = new ArrayList<>(entries.size());
        for (LedgerEntry entry : entries) {
            Timestamp sentAt = Timestamp.from(entry.sentAt());
            rows.add(new Object[] {entry.userId(), entry.dedupeKey(), entry.type().name(), entry.contentRef(), sentAt, entry.holdout(), entry.userId()});
        }
        jdbc.batchUpdate(INSERT, rows);
    }

    @Override
    public void release(String dedupeKey, Collection<UUID> userIds) {
        if (userIds.isEmpty()) {
            return;
        }
        jdbc.update("DELETE FROM engagement_sends WHERE dedupe_key = ? AND user_id = ANY (?)", dedupeKey,
                userIds.toArray(UUID[]::new));
    }

    @Override
    public int purgeBefore(Instant before, int batchSize) {
        return jdbc.update("""
                DELETE FROM engagement_sends WHERE ctid IN (
                    SELECT ctid FROM engagement_sends WHERE sent_at < ? LIMIT ?)
                """, Timestamp.from(before), batchSize);
    }

    /** A row of a type this binary no longer knows is left out. */
    private static Optional<LedgerEntry> entry(ResultSet row) throws SQLException {
        UUID userId = row.getObject("user_id", UUID.class);
        String dedupeKey = row.getString("dedupe_key");
        String contentRef = row.getString("content_ref");
        Instant sentAt = row.getTimestamp("sent_at").toInstant();
        boolean holdout = row.getBoolean("holdout");
        return EnumNames.find(NotificationType.class, row.getString("notification_type"))
                .map(type -> new LedgerEntry(userId, type, dedupeKey, contentRef, sentAt, holdout));
    }
}
