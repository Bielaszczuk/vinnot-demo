package com.vinnot.notification.infrastructure.persistence;

import com.vinnot.notification.application.port.out.PushAudiencePort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.DateTimeException;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Component
public class JdbcPushAudience implements PushAudiencePort {
    private final JdbcTemplate jdbc;

    public JdbcPushAudience(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<Member> findActive(Collection<UUID> userIds) {
        if (userIds.isEmpty()) {
            return List.of();
        }
        return jdbc.query("SELECT id, timezone FROM users WHERE id = ANY (?) AND active AND NOT locked ORDER BY id",
                (row, index) -> new Member(row.getObject("id", UUID.class), zone(row.getString("timezone"))),
                (Object) userIds.toArray(UUID[]::new));
    }

    private static ZoneId zone(String id) {
        try {
            return ZoneId.of(id);
        } catch (DateTimeException | NullPointerException unknown) {
            return ZoneOffset.UTC;
        }
    }
}
