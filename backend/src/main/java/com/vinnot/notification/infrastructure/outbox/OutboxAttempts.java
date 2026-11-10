package com.vinnot.notification.infrastructure.outbox;

import com.vinnot.shared.infrastructure.effects.DurableEffectWorker;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Objects;

/**
 * Whether the running attempt of an outbox job is its last one (#490). The worker counts an attempt only after it
 * fails, so while a job runs {@code attempts} holds its earlier failures. It reads in its own transaction, so a job
 * transaction a failure already aborted cannot hide the answer.
 */
@Component
public class OutboxAttempts {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate ownTransaction;

    public OutboxAttempts(JdbcTemplate jdbc, PlatformTransactionManager transactions) {
        this.jdbc = jdbc;
        this.ownTransaction = new TransactionTemplate(transactions);
        this.ownTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.ownTransaction.setReadOnly(true);
    }

    /** True when the job with this deduplication key fails for good if the running attempt fails. */
    public boolean lastAttempt(String deduplicationKey) {
        Integer attempts = ownTransaction.execute(status -> jdbc.query(
                "SELECT attempts FROM external_effects WHERE deduplication_key = ?",
                row -> row.next() ? row.getInt("attempts") : null, deduplicationKey));
        return Objects.nonNull(attempts) && attempts >= DurableEffectWorker.MAX_ATTEMPTS - 1;
    }
}
