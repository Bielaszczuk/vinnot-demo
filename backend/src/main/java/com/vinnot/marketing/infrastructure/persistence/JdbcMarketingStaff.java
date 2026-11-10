package com.vinnot.marketing.infrastructure.persistence;

import com.vinnot.marketing.application.port.out.AdminRecipients;
import com.vinnot.marketing.application.port.out.ReviewerEmails;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The administrators who approve social posts: active, not locked accounts holding {@code ROLE_ADMIN}, and the emails of
 * whoever reviewed or edited a post (#489).
 */
@Component
public class JdbcMarketingStaff implements AdminRecipients, ReviewerEmails {
    private final JdbcTemplate jdbc;

    public JdbcMarketingStaff(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<UUID> admins() {
        return jdbc.queryForList("""
                SELECT DISTINCT u.id FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id
                WHERE u.active AND NOT u.locked AND r.name = 'ROLE_ADMIN' ORDER BY u.id
                """, UUID.class);
    }

    @Override
    public Map<UUID, String> emailsOf(Collection<UUID> accountIds) {
        Map<UUID, String> emails = new HashMap<>();
        if (accountIds.isEmpty()) {
            return emails;
        }
        jdbc.query("SELECT id, email FROM users WHERE id = ANY(?)",
                row -> { emails.put(row.getObject("id", UUID.class), row.getString("email")); },
                (Object) accountIds.toArray(UUID[]::new));
        return emails;
    }
}
