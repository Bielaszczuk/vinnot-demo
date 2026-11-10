package com.vinnot.activity.infrastructure.persistence;

import com.vinnot.activity.application.port.out.ContentViewRepositoryPort;
import com.vinnot.activity.domain.model.ContentKind;
import com.vinnot.activity.domain.model.ViewedContent;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Component;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class JdbcContentViewRepository implements ContentViewRepositoryPort {
    private final JdbcTemplate jdbc;

    public JdbcContentViewRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void record(UUID userId, ContentKind kind, UUID entityId, Instant at) {
        jdbc.update("""
                INSERT INTO content_views(user_id,kind,entity_id,view_day,views,last_viewed_at)
                SELECT id, ?, ?, ?, 1, ? FROM users WHERE id = ?
                ON CONFLICT (user_id,kind,entity_id,view_day) DO UPDATE SET views = content_views.views + 1,
                    last_viewed_at = GREATEST(content_views.last_viewed_at, EXCLUDED.last_viewed_at)
                """, kind.name(), entityId, Date.valueOf(utcDay(at)), Timestamp.from(at), userId);
    }

    @Override
    public Map<UUID, List<ViewedContent>> viewsSince(Collection<UUID> userIds, ContentKind kind, Instant since) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, List<ViewedContent>> views = new LinkedHashMap<>();
        RowCallbackHandler collect = row -> views
                .computeIfAbsent(row.getObject("user_id", UUID.class), user -> new ArrayList<>())
                .add(new ViewedContent(kind, row.getObject("entity_id", UUID.class), row.getInt("views"),
                        row.getTimestamp("last_viewed_at").toInstant()));
        jdbc.query("""
                SELECT user_id, entity_id, SUM(views) AS views, MAX(last_viewed_at) AS last_viewed_at
                FROM content_views WHERE user_id = ANY (?) AND kind = ? AND last_viewed_at >= ?
                GROUP BY user_id, entity_id ORDER BY user_id, views DESC, last_viewed_at DESC, entity_id
                """, collect, userIds.toArray(UUID[]::new), kind.name(), Timestamp.from(since));
        return views;
    }

    @Override
    public List<ViewedContent> mostViewed(ContentKind kind, Instant since, int limit) {
        return jdbc.query("""
                SELECT entity_id, SUM(views) AS views, MAX(last_viewed_at) AS last_viewed_at
                FROM content_views WHERE kind = ? AND view_day >= ? AND last_viewed_at >= ?
                GROUP BY entity_id ORDER BY views DESC, last_viewed_at DESC, entity_id LIMIT ?
                """, (row, index) -> new ViewedContent(kind, row.getObject("entity_id", UUID.class),
                        row.getInt("views"), row.getTimestamp("last_viewed_at").toInstant()),
                kind.name(), Date.valueOf(utcDay(since)), Timestamp.from(since), limit);
    }

    @Override
    public int purgeBefore(Instant cutoff, int batchSize) {
        return jdbc.update("""
                DELETE FROM content_views WHERE ctid IN (
                    SELECT ctid FROM content_views WHERE view_day < ? LIMIT ?)
                """, Date.valueOf(utcDay(cutoff)), batchSize);
    }

    private static LocalDate utcDay(Instant at) {
        return LocalDate.ofInstant(at, ZoneOffset.UTC);
    }
}
