package com.vinnot.user.infrastructure.persistence.adapter;

import com.vinnot.user.application.port.out.SecurityEventPort;
import com.vinnot.user.application.port.out.model.SecurityEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.sql.Timestamp;
import java.time.Instant;

/**
 * {@code security_events} (V73). Inside a transaction the row is written after that transaction commits, in its own
 * transaction: a rolled back action leaves no event, a failed insert cannot abort the action's transaction, and the
 * insert never waits on the account row the action still holds locked (a deletion or an email change).
 * The account is looked up while inserting, so an event about an account deleted meanwhile is kept without the link.
 */
@Component
public class JdbcSecurityEventAdapter implements SecurityEventPort {
    private static final Logger LOGGER = LoggerFactory.getLogger(JdbcSecurityEventAdapter.class);

    private final JdbcTemplate jdbc;
    private final TransactionTemplate ownTransaction;

    public JdbcSecurityEventAdapter(JdbcTemplate jdbc, PlatformTransactionManager transactions) {
        this.jdbc = jdbc;
        this.ownTransaction = new TransactionTemplate(transactions);
        this.ownTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Override
    public void record(SecurityEvent event) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            insert(event);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    ownTransaction.executeWithoutResult(status -> insert(event));
                } catch (RuntimeException failure) {
                    LOGGER.error("Security event could not be stored: type={} userId={}", event.type(), event.userId(), failure);
                }
            }
        });
    }

    private void insert(SecurityEvent event) {
        jdbc.update("""
                INSERT INTO security_events (user_id, event_type, ip_address, user_agent, created_at)
                VALUES ((SELECT u.id FROM users u WHERE u.id = ?), ?, ?, ?, ?)
                """, event.userId(), event.type().name(), event.ipAddress(), event.userAgent(),
                Timestamp.from(event.occurredAt()));
    }

    @Override
    public int purgeBefore(Instant cutoff, int batchSize) {
        return jdbc.update("""
                DELETE FROM security_events WHERE id IN (
                    SELECT id FROM security_events WHERE created_at < ? ORDER BY created_at LIMIT ?)
                """, Timestamp.from(cutoff), batchSize);
    }
}
