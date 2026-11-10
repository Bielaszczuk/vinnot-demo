package com.vinnot.payment.infrastructure.persistence;

import com.vinnot.payment.application.port.out.PaymentReconciliationQueue;
import com.vinnot.payment.domain.model.ReconciliationClaim;
import com.vinnot.payment.application.service.PaymentExecutionPolicy.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.Objects;

/**
 * Schedule sentinels: a notification sets {@code next_check_at='-infinity'} so woken jobs are claimed before overdue
 * scheduled polls, and a parked job holds {@code 'infinity'} so it is never polled until woken again. Migration V38
 * also wakes jobs when a paid registration stops being confirmed or its event is cancelled.
 */
public class PostgresPaymentReconciliationQueue implements PaymentReconciliationQueue {
    private static final int LEASE_SECONDS = 900;

    private final JdbcTemplate jdbc;
    private final Environment environment;
    public PostgresPaymentReconciliationQueue(JdbcTemplate jdbc) { this(jdbc, Environment.SANDBOX); }
    public PostgresPaymentReconciliationQueue(JdbcTemplate jdbc, Environment environment) {
        this.jdbc = jdbc;
        this.environment = Objects.requireNonNull(environment);
    }

    @Override
    @Transactional
    public void notify(UUID attemptId) {
        jdbc.update("""
                INSERT INTO payment_reconciliation_jobs(attempt_id,next_check_at)
                SELECT id,'-infinity' FROM payment_checkout_attempts WHERE environment='%s' AND id=? AND dispatched_at IS NOT NULL
                ON CONFLICT(attempt_id) DO UPDATE SET revision=payment_reconciliation_jobs.revision+1,next_check_at='-infinity'
                """.formatted(environment.name()), attemptId);
    }

    @Override
    @Transactional
    public void notifyKnownPayment(String paymentId) {
        jdbc.update("""
                INSERT INTO payment_reconciliation_jobs(attempt_id,next_check_at)
                SELECT a.id,'-infinity' FROM payment_checkout_attempts a JOIN payment_observations o ON o.attempt_id=a.id
                WHERE a.environment=? AND o.payment_id=? AND a.dispatched_at IS NOT NULL
                ON CONFLICT(attempt_id) DO UPDATE SET revision=payment_reconciliation_jobs.revision+1,next_check_at='-infinity'
                """, environment.name(), paymentId);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public List<ReconciliationClaim> claimDue(Instant now, int limit) {
        if (limit < 1 || limit > 20) {
            throw new IllegalArgumentException("Invalid reconciliation batch");
        }
        // Includes READY and cancelled/expired registrations: all can receive delayed payments or reversals.
        jdbc.update("""
                INSERT INTO payment_reconciliation_jobs(attempt_id,next_check_at)
                SELECT a.id,? FROM payment_checkout_attempts a WHERE a.environment='%s' AND a.dispatched_at IS NOT NULL
                AND NOT EXISTS (SELECT 1 FROM payment_reconciliation_jobs j WHERE j.attempt_id=a.id)
                ORDER BY a.dispatched_at,a.id LIMIT 100 ON CONFLICT DO NOTHING
                """.formatted(environment.name()), Timestamp.from(now));
        UUID token = UUID.randomUUID();
        return jdbc.query("""
                WITH due AS (SELECT attempt_id FROM payment_reconciliation_jobs
                WHERE attempt_id IN (SELECT id FROM payment_checkout_attempts WHERE environment='%s')
                AND next_check_at<=? AND (lease_until IS NULL OR lease_until<=?)
                ORDER BY next_check_at,attempt_id FOR UPDATE SKIP LOCKED LIMIT ?)
                UPDATE payment_reconciliation_jobs j SET lease_token=?,lease_until=?
                FROM due WHERE j.attempt_id=due.attempt_id RETURNING j.attempt_id,j.revision
                """.formatted(environment.name()), (row, index) -> new ReconciliationClaim(row.getObject(1, UUID.class), token, row.getLong(2)),
                Timestamp.from(now), Timestamp.from(now), limit, token, Timestamp.from(now.plusSeconds(LEASE_SECONDS)));
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void requireLease(ReconciliationClaim claim, Instant now) {
        var owned = jdbc.query("""
                SELECT attempt_id FROM payment_reconciliation_jobs
                WHERE attempt_id=? AND lease_token=? AND lease_until>? FOR UPDATE
                """, (row, index) -> row.getObject(1, UUID.class), claim.attemptId(), claim.token(), Timestamp.from(now));
        if (owned.isEmpty()) {
            throw new IllegalStateException("Reconciliation lease lost");
        }
    }

    @Override
    public void park(ReconciliationClaim claim) {
        // A notification that arrived while the job was leased bumped the revision and keeps it due.
        jdbc.update("""
                UPDATE payment_reconciliation_jobs SET lease_token=NULL,lease_until=NULL,last_checked_at=now(),
                next_check_at=CASE WHEN revision=? THEN 'infinity' ELSE next_check_at END,failures=0,last_failure=NULL
                WHERE attempt_id=? AND lease_token=?
                """, claim.revision(), claim.attemptId(), claim.token());
    }

    @Override
    public void finish(ReconciliationClaim claim, Instant nextCheck, String failureCode) {
        jdbc.update("""
                UPDATE payment_reconciliation_jobs SET lease_token=NULL,lease_until=NULL,last_checked_at=now(),
                next_check_at=CASE WHEN revision=? THEN ? ELSE next_check_at END,
                failures=CASE WHEN CAST(? AS varchar) IS NULL THEN 0 ELSE LEAST(failures+1,1000000) END,last_failure=?
                WHERE attempt_id=? AND lease_token=?
                """, claim.revision(), Timestamp.from(nextCheck), failureCode, failureCode, claim.attemptId(), claim.token());
    }
}
