package com.vinnot.payment.infrastructure.persistence;

import com.vinnot.payment.application.port.out.RefundStore;
import com.vinnot.payment.domain.model.RefundIntent;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.OptionalInt;
import java.util.UUID;

public class PostgresRefundStore implements RefundStore {
    private final JdbcTemplate jdbc;
    public PostgresRefundStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public boolean requireRefund(UUID attemptId, String paymentId, BigDecimal amount) {
        return 1 == jdbc.update("""
                INSERT INTO payment_refund_intents(id,attempt_id,payment_id,amount,status) VALUES (?,?,?,?,'PREPARED')
                ON CONFLICT(payment_id) DO NOTHING
                """, UUID.randomUUID(), attemptId, paymentId, amount);
    }

    @Override
    public List<RefundIntent> pending(UUID attemptId) {
        return jdbc.query("""
                SELECT * FROM payment_refund_intents WHERE attempt_id=? AND status IN ('PREPARED','SENDING','UNCERTAIN') ORDER BY created_at LIMIT 20
                """, (row, index) -> intent(row), attemptId);
    }

    @Override
    @Transactional(propagation = Propagation.NEVER)
    public Optional<RefundIntent> claim(UUID refundId) {
        return jdbc.query("""
                UPDATE payment_refund_intents SET status='SENDING',dispatched_at=now(),updated_at=now()
                WHERE id=? AND status='PREPARED' RETURNING *
                """, (row, index) -> intent(row), refundId).stream().findFirst();
    }

    @Override
    public void uncertain(UUID refundId) {
        jdbc.update("UPDATE payment_refund_intents SET status='UNCERTAIN',updated_at=now() WHERE id=? AND status='SENDING'", refundId);
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public OptionalInt reject(UUID refundId, String reason) {
        return jdbc.query("""
                UPDATE payment_refund_intents SET status='REJECTED',rejection_reason=?,rejections=rejections+1,updated_at=now()
                WHERE id=? AND status='SENDING' RETURNING rejections
                """, (row, index) -> row.getInt(1), reason, refundId).stream().mapToInt(Integer::intValue).findFirst();
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public boolean retryRejected(String paymentId) {
        return 1 == jdbc.update("""
                UPDATE payment_refund_intents SET status='PREPARED',rejection_reason=NULL,updated_at=now()
                WHERE payment_id=? AND status='REJECTED'
                """, paymentId);
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void reconcile(String paymentId, boolean fullyRefunded, boolean needsReview) {
        if (fullyRefunded || needsReview) {
            jdbc.update("UPDATE payment_refund_intents SET status=?,updated_at=now() WHERE payment_id=? AND status<>'SUCCEEDED'",
                    fullyRefunded ? "SUCCEEDED" : "REVIEW", paymentId);
        }
    }

    private static RefundIntent intent(ResultSet row) throws SQLException {
        return new RefundIntent(row.getObject("id", UUID.class), row.getObject("attempt_id", UUID.class),
                row.getString("payment_id"), row.getBigDecimal("amount"), RefundIntent.Status.valueOf(row.getString("status")),
                row.getInt("rejections"));
    }
}
