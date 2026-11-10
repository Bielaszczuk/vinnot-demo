package com.vinnot.user.infrastructure.recovery;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

/**
 * Recovery requests hold an email address. One the worker could not process within a day is discarded:
 * the person can ask again, and the address does not wait in the outbox for an operator.
 */
@Component
public class AccountRecoveryRetention {
    static final Duration RETENTION = Duration.ofDays(1);
    private final JdbcTemplate jdbc;

    public AccountRecoveryRetention(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Scheduled(fixedDelayString = "${app.account-recovery.retention-ms:3600000}")
    @Transactional
    public void purgeExpired() {
        jdbc.update("""
                DELETE FROM external_effects WHERE kind = ?
                AND created_at < CURRENT_TIMESTAMP - (? * INTERVAL '1 second')
                """, OutboxAccountRecoveryAdapter.KIND, RETENTION.toSeconds());
    }
}
