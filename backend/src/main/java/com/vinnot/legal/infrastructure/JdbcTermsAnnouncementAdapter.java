package com.vinnot.legal.infrastructure;

import com.vinnot.legal.application.port.out.TermsAnnouncementPort;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

/** Walks the users by id; the revision's row is locked with FOR UPDATE for the run and remembers the last user. */
@Component
@RequiredArgsConstructor
public class JdbcTermsAnnouncementAdapter implements TermsAnnouncementPort {
    private final JdbcTemplate jdbc;

    @Override
    public List<UUID> nextRecipients(String revision, int limit) {
        jdbc.update("INSERT INTO legal_terms_announcements(acceptance_revision) VALUES (?) ON CONFLICT DO NOTHING", revision);
        var state = jdbc.queryForMap("""
                SELECT last_user_id, completed_at FROM legal_terms_announcements WHERE acceptance_revision = ? FOR UPDATE
                """, revision);
        if (Objects.nonNull(state.get("completed_at"))) {
            return List.of();
        }
        Object last = state.get("last_user_id");
        List<UUID> users = jdbc.queryForList("""
                SELECT u.id FROM users u
                WHERE u.active AND NOT u.locked AND (?::uuid IS NULL OR u.id > ?::uuid)
                  AND EXISTS (SELECT 1 FROM user_legal_acceptances a
                              WHERE a.user_id = u.id AND a.document_type = 'terms' AND a.acceptance_revision <> ?)
                  AND NOT EXISTS (SELECT 1 FROM user_legal_acceptances a
                                  WHERE a.user_id = u.id AND a.document_type = 'terms' AND a.acceptance_revision = ?)
                ORDER BY u.id LIMIT ?
                """, UUID.class, last, last, revision, revision, limit);
        if (users.size() < limit) {
            jdbc.update("UPDATE legal_terms_announcements SET completed_at = CURRENT_TIMESTAMP WHERE acceptance_revision = ?", revision);
        }
        if (!users.isEmpty()) {
            jdbc.update("UPDATE legal_terms_announcements SET last_user_id = ? WHERE acceptance_revision = ?",
                    users.get(users.size() - 1), revision);
        }
        return users;
    }
}
