package com.vinnot.user.infrastructure.persistence.adapter;

import com.vinnot.shared.application.port.AccountAccessPort;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** A single indexed lookup; no aggregate hydration or catalog scan per authenticated request. */
@Component
@RequiredArgsConstructor
public class AccountAccessAdapter implements AccountAccessPort {
    private final JdbcTemplate jdbc;

    @Override
    public boolean permits(UUID userId, List<String> tokenRoles, long sessionVersion) {
        List<String> currentRoles = jdbc.queryForList("""
                SELECT r.name FROM users u
                JOIN user_roles ur ON ur.user_id = u.id
                JOIN roles r ON r.id = ur.role_id
                WHERE u.id = ? AND u.active = true AND u.locked = false AND u.session_version = ?
                """, String.class, userId, sessionVersion);
        return !currentRoles.isEmpty() && new HashSet<>(currentRoles).equals(new HashSet<>(tokenRoles));
    }
}
