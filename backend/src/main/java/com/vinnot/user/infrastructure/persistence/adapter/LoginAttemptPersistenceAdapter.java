package com.vinnot.user.infrastructure.persistence.adapter;

import com.vinnot.user.application.port.out.LoginAttemptPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * {@code users.failed_login_attempts} and {@code users.login_locked_until} (V72). Each method is a single statement
 * whose WHERE clause checks the lock, so parallel attempts serialize on the account row and PostgreSQL re-checks the
 * condition against the latest committed row: a burst starts exactly one lock and nothing counts or clears it while it
 * runs. They never touch the row version, so a concurrent save of the loaded account does not fail, and JPA never
 * writes these columns back (see UserJpaEntity).
 */
@Component
public class LoginAttemptPersistenceAdapter implements LoginAttemptPort {
    private static final String NOT_LOCKED = "(login_locked_until IS NULL OR login_locked_until <= ?)";

    private final JdbcTemplate jdbc;

    public LoginAttemptPersistenceAdapter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public int recordFailure(UUID userId, Instant now) {
        List<Integer> counts = jdbc.queryForList(
                "UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = ? AND " + NOT_LOCKED
                        + " RETURNING failed_login_attempts",
                Integer.class, userId, Timestamp.from(now));
        return counts.isEmpty() ? 0 : counts.get(0);
    }

    @Override
    public boolean startLock(UUID userId, int threshold, Instant now, Instant lockedUntil) {
        return jdbc.update("UPDATE users SET login_locked_until = ?, failed_login_attempts = 0"
                        + " WHERE id = ? AND failed_login_attempts >= ? AND " + NOT_LOCKED,
                Timestamp.from(lockedUntil), userId, threshold, Timestamp.from(now)) == 1;
    }

    @Override
    public Optional<Instant> activeLock(UUID userId, Instant now) {
        return jdbc.queryForList("SELECT login_locked_until FROM users WHERE id = ? AND login_locked_until > ?",
                        Timestamp.class, userId, Timestamp.from(now))
                .stream().findFirst().map(Timestamp::toInstant);
    }

    @Override
    public void clearFailures(UUID userId, Instant now) {
        jdbc.update("UPDATE users SET failed_login_attempts = 0, login_locked_until = NULL WHERE id = ? AND " + NOT_LOCKED
                        + " AND (failed_login_attempts <> 0 OR login_locked_until IS NOT NULL)",
                userId, Timestamp.from(now));
    }

    @Override
    public void reset(UUID userId) {
        jdbc.update("""
                UPDATE users SET failed_login_attempts = 0, login_locked_until = NULL
                WHERE id = ? AND (failed_login_attempts <> 0 OR login_locked_until IS NOT NULL)
                """, userId);
    }
}
