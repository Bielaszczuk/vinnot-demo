package com.vinnot.payment.infrastructure.persistence;

import com.vinnot.payment.application.port.out.PaymentReceiptReader;
import com.vinnot.payment.domain.model.PaymentReceiptStatus;

import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Optional;
import java.util.UUID;

public class PostgresPaymentReceiptReader implements PaymentReceiptReader {
    private final JdbcTemplate jdbc;
    private final String environment;

    public PostgresPaymentReceiptReader(JdbcTemplate jdbc, String environment) {
        this.jdbc = jdbc;
        this.environment = environment;
    }

    @Override
    public Optional<PaymentReceiptStatus> find(UUID attemptId) {
        return jdbc
                .query(
                        """
SELECT p.status,r.status AS registration_status,COALESCE(p.needs_review,false) AS needs_review
FROM payment_checkout_attempts a JOIN event_registrations r ON r.id=a.registration_id
LEFT JOIN LATERAL (SELECT status,needs_review FROM payment_observations
    WHERE attempt_id=a.id ORDER BY credited DESC,provider_updated_at DESC,payment_id DESC LIMIT 1) p ON true
WHERE a.id=? AND a.environment=? AND a.dispatched_at IS NOT NULL
""",
                        (row, index) ->
                                PaymentReceiptStatus.from(
                                        row.getString("status"),
                                        row.getString("registration_status"),
                                        row.getBoolean("needs_review")),
                        attemptId,
                        environment)
                .stream()
                .findFirst();
    }
}
