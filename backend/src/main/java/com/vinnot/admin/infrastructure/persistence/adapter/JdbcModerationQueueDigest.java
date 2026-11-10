package com.vinnot.admin.infrastructure.persistence.adapter;

import com.vinnot.admin.application.port.out.ModerationQueueDigest;
import com.vinnot.shared.infrastructure.persistence.CoverageCursor;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Reads the queues directly; the window comes from the single-row {@link CoverageCursor}. */
@Component
@RequiredArgsConstructor
public class JdbcModerationQueueDigest implements ModerationQueueDigest {
    private static final CoverageCursor CURSOR = new CoverageCursor("moderation_digest_cursor", "id");
    private static final int CURSOR_ROW = 1;
    private final JdbcTemplate jdbc;

    @Override
    public Window claim(Instant now) {
        CoverageCursor.Window window = CURSOR.claim(jdbc, CURSOR_ROW, now);
        return new Window(window.from(), window.to());
    }

    @Override
    public NewWork newWork(Window window) {
        Timestamp from = Timestamp.from(window.from());
        Timestamp to = Timestamp.from(window.to());
        List<String> wines = jdbc.queryForList("""
                SELECT wine_name FROM wine_submissions
                WHERE status = 'NEEDS_REVIEW' AND updated_at > ? AND updated_at <= ? ORDER BY updated_at LIMIT 2
                """, String.class, from, to);
        int submissions = jdbc.queryForObject("""
                SELECT count(*) FROM wine_submissions WHERE status = 'NEEDS_REVIEW' AND updated_at > ? AND updated_at <= ?
                """, Integer.class, from, to);
        List<String> reasons = jdbc.queryForList("""
                SELECT reason FROM community_reports
                WHERE status = 'OPEN' AND created_at > ? AND created_at <= ? ORDER BY created_at LIMIT 2
                """, String.class, from, to);
        int reports = jdbc.queryForObject("""
                SELECT count(*) FROM community_reports WHERE status = 'OPEN' AND created_at > ? AND created_at <= ?
                """, Integer.class, from, to);
        return new NewWork(submissions, reports, submissions == 1 ? wines.get(0) : null, reports == 1 ? reasons.get(0) : null);
    }

    @Override
    public List<UUID> staff() {
        return jdbc.queryForList("""
                SELECT DISTINCT u.id FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id
                WHERE u.active AND NOT u.locked AND r.name IN ('ROLE_ADMIN', 'ROLE_MODERATOR') ORDER BY u.id
                """, UUID.class);
    }
}
