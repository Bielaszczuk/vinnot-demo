package com.vinnot.payment.infrastructure.persistence;

import com.vinnot.payment.application.port.out.PaymentLedger;
import com.vinnot.payment.domain.model.ProviderPayment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.sql.Timestamp;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

public class PostgresPaymentLedger implements PaymentLedger {
    private final JdbcTemplate jdbc;
    public PostgresPaymentLedger(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override
    public Optional<Entry> find(String id) {
        return jdbc.query("SELECT * FROM payment_observations WHERE payment_id=?", (row, index) -> {
            var approved = row.getTimestamp("approved_at");
            return new Entry(new ProviderPayment(row.getString("payment_id"), row.getObject("attempt_id", UUID.class),
                    row.getString("seller_id"), true, row.getBigDecimal("amount"), row.getString("currency"),
                    row.getBigDecimal("application_fee"), row.getBigDecimal("refunded_amount"),
                    ProviderPayment.Status.valueOf(row.getString("status")), row.getTimestamp("provider_updated_at").toInstant(),
                    Objects.isNull(approved) ? null : approved.toInstant()), row.getBoolean("credited"), row.getBoolean("needs_review"));
        }, id).stream().findFirst();
    }

    @Override
    public Optional<String> creditedPayment(UUID attemptId) {
        return jdbc.query("SELECT payment_id FROM payment_observations WHERE attempt_id=? AND credited",
                (row, index) -> row.getString(1), attemptId).stream().findFirst();
    }

    @Override
    public List<String> knownPayments(UUID attemptId) {
        return jdbc.query("SELECT payment_id FROM payment_observations WHERE attempt_id=? ORDER BY payment_id LIMIT 21",
                (row, index) -> row.getString(1), attemptId);
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void save(Entry entry) {
        var p = entry.payment();
        int changed = jdbc.update("""
                INSERT INTO payment_observations(payment_id,attempt_id,seller_id,amount,currency,application_fee,refunded_amount,
                    status,provider_updated_at,approved_at,credited,needs_review)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(payment_id) DO UPDATE SET application_fee=excluded.application_fee,
                    refunded_amount=excluded.refunded_amount,status=excluded.status,provider_updated_at=excluded.provider_updated_at,
                    approved_at=excluded.approved_at,credited=excluded.credited,needs_review=excluded.needs_review,observed_at=now()
                WHERE payment_observations.attempt_id=excluded.attempt_id AND payment_observations.seller_id=excluded.seller_id
                    AND payment_observations.amount=excluded.amount AND payment_observations.currency=excluded.currency
                """, p.id(), p.attemptId(), p.sellerId(), p.amount(), p.currency(), p.applicationFee(), p.refundedAmount(), p.status().name(),
                Timestamp.from(p.updatedAt()), Objects.isNull(p.approvedAt()) ? null : Timestamp.from(p.approvedAt()), entry.credited(), entry.review());
        if (changed != 1) {
            throw new IllegalStateException("Payment identity changed");
        }
    }
}
