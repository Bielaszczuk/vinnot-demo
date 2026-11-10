package com.vinnot.payment.infrastructure.persistence;

import com.vinnot.payment.application.port.out.CheckoutAttemptStore;
import com.vinnot.payment.domain.model.CheckoutAttempt;
import com.vinnot.payment.application.service.PaymentExecutionPolicy.Environment;
import com.vinnot.payment.domain.model.CheckoutSnapshot;
import com.vinnot.payment.domain.valueobject.CommissionPolicy;
import com.vinnot.payment.domain.valueobject.TicketPaymentQuote;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.net.URI;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** PostgreSQL CAS claims are committed before dispatch. No retries/leases can release an uncertain claim. */
public class PostgresCheckoutAttemptStore implements CheckoutAttemptStore {
    private static final int MAXIMUM_RECONCILIATION_BATCH = 200;
    private final JdbcTemplate jdbc;

    private final Environment environment;
    public PostgresCheckoutAttemptStore(JdbcTemplate jdbc) { this(jdbc, Environment.SANDBOX); }
    public PostgresCheckoutAttemptStore(JdbcTemplate jdbc, Environment environment) {
        this.jdbc = jdbc;
        this.environment = Objects.requireNonNull(environment);
    }

    @Override
    @Transactional
    public CheckoutSnapshot prepare(CheckoutSnapshot snapshot) {
        // The columns accept NULL only so a deleted account can leave its history behind (V77).
        if (!snapshot.linked()) {
            throw new IllegalArgumentException("A new checkout names its registration, event, buyer and organizer");
        }
        var quote = snapshot.quote();
        jdbc.update("""
                INSERT INTO payment_checkout_attempts
                (id, registration_id, event_id, buyer_id, organizer_id, seller_id, title,
                 unit_price, quantity, currency, total_amount, commission_amount,
                 commission_basis_points, commission_policy, expires_at, return_to_app, environment)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'%s')
                ON CONFLICT (registration_id,provider,environment) DO NOTHING
                """.formatted(environment.name()), snapshot.id(), snapshot.registrationId(), snapshot.eventId(), snapshot.buyerId(),
                snapshot.organizerId(), snapshot.sellerId(), snapshot.title(), quote.unitPrice(), quote.quantity(),
                quote.currency(), quote.total(), quote.commission(), quote.commissionBasisPoints(),
                quote.commissionPolicy().id(), Timestamp.from(snapshot.expiresAt()), snapshot.returnToApp());
        var existing = jdbc.queryForObject("""
                SELECT * FROM payment_checkout_attempts WHERE registration_id=?
                AND provider='MERCADO_PAGO' AND environment='%s'
                """.formatted(environment.name()), (row, index) -> snapshot(row), snapshot.registrationId());
        if (!snapshot.hasSameTerms(existing)) {
            throw new BusinessRuleViolationException("PAYMENT_TERMS_CHANGED",
                    "La reserva ya tiene un intento de pago con otras condiciones.");
        }
        return existing;
    }

    @Override
    public Optional<CheckoutAttempt> find(UUID attemptId, UUID buyerId) {
        return jdbc.query("SELECT * FROM payment_checkout_attempts WHERE environment='%s' AND id=? AND buyer_id=?".formatted(environment.name()),
                (row, index) -> new CheckoutAttempt(snapshot(row), CheckoutAttempt.Status.valueOf(row.getString("status")),
                        row.getString("provider_reference"), nullableUri(row.getString("checkout_url"))), attemptId, buyerId)
                .stream().findFirst();
    }

    @Override
    public Optional<CheckoutSnapshot> findByRegistration(UUID registrationId, UUID buyerId) {
        return jdbc.query("""
                SELECT * FROM payment_checkout_attempts WHERE registration_id=? AND buyer_id=?
                AND provider='MERCADO_PAGO' AND environment='%s'
                """.formatted(environment.name()), (row, index) -> snapshot(row), registrationId, buyerId).stream().findFirst();
    }

    @Override
    @Transactional(propagation = Propagation.NEVER)
    public Optional<CheckoutSnapshot> claim(UUID attemptId, UUID buyerId, Instant now) {
        return jdbc.query("""
                UPDATE payment_checkout_attempts SET status='CREATING',dispatched_at=?,updated_at=?
                WHERE environment='%s' AND id=? AND buyer_id=? AND status='PREPARED' AND expires_at>?
                RETURNING *
                """.formatted(environment.name()), (row, index) -> snapshot(row), Timestamp.from(now), Timestamp.from(now), attemptId,
                buyerId, Timestamp.from(now)).stream().findFirst();
    }

    @Override
    @Transactional(propagation = Propagation.NEVER)
    public boolean complete(CheckoutAttempt ready) {
        if (ready.status() != CheckoutAttempt.Status.READY) {
            throw new IllegalArgumentException("Expected a ready checkout");
        }
        return jdbc.update("""
                UPDATE payment_checkout_attempts SET status='READY',provider_reference=?,checkout_url=?,updated_at=now()
                WHERE environment='%s' AND id=? AND status='CREATING'
                """.formatted(environment.name()), ready.providerReference(), ready.checkoutUrl().toString(), ready.snapshot().id()) == 1;
    }

    @Override
    @Transactional(propagation = Propagation.NEVER)
    public void markUncertain(UUID attemptId) {
        jdbc.update("""
                UPDATE payment_checkout_attempts SET status='UNCERTAIN',updated_at=now()
                WHERE environment='%s' AND id=? AND status='CREATING'
                """.formatted(environment.name()), attemptId);
    }

    @Override
    public Optional<CheckoutSnapshot> dispatchedSnapshot(UUID attemptId) {
        return jdbc.query("SELECT * FROM payment_checkout_attempts WHERE environment='%s' AND id=? AND dispatched_at IS NOT NULL".formatted(environment.name()),
                (row, index) -> snapshot(row), attemptId).stream().findFirst();
    }

    @Override
    public List<UUID> needingReconciliation(Instant dispatchedBefore, int limit) {
        if (limit < 1 || limit > MAXIMUM_RECONCILIATION_BATCH) {
            throw new IllegalArgumentException("Reconciliation batch must contain 1 to 200 attempts");
        }
        return jdbc.query("""
                SELECT id FROM payment_checkout_attempts WHERE environment='%s' AND status IN ('CREATING','UNCERTAIN')
                AND dispatched_at<=? ORDER BY dispatched_at,id LIMIT ?
                """.formatted(environment.name()), (row, index) -> row.getObject(1, UUID.class), Timestamp.from(dispatchedBefore), limit);
    }

    /** Rebuilds the stored terms with the stored commission, never the current one, so old checkouts still reconcile. */
    static CheckoutSnapshot snapshot(ResultSet row) throws SQLException {
        return new CheckoutSnapshot(row.getObject("id", UUID.class), row.getObject("registration_id", UUID.class),
                row.getObject("event_id", UUID.class), row.getObject("buyer_id", UUID.class),
                row.getObject("organizer_id", UUID.class), row.getString("seller_id"), row.getString("title"),
                new TicketPaymentQuote(row.getBigDecimal("unit_price"), row.getInt("quantity"), row.getString("currency"),
                        new CommissionPolicy(row.getInt("commission_basis_points"), row.getString("commission_policy"))),
                row.getTimestamp("expires_at").toInstant(), row.getBoolean("return_to_app"));
    }

    private static URI nullableUri(String value) { return Objects.isNull(value) ? null : URI.create(value); }
}
