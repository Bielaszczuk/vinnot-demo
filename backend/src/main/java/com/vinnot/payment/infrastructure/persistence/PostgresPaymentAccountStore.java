package com.vinnot.payment.infrastructure.persistence;

import com.vinnot.payment.application.port.out.PaymentAccountStore;
import com.vinnot.payment.application.port.out.SellerCredentialReader;
import com.vinnot.payment.application.service.PaymentExecutionPolicy.Environment;
import com.vinnot.payment.domain.model.SellerCredentials;
import com.vinnot.payment.infrastructure.security.PaymentCredentialCipher;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import com.vinnot.payment.application.port.out.PaymentCredentialRenewalStore;
import com.vinnot.payment.domain.model.CredentialRenewalClaim;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import java.time.Duration;
import java.util.Objects;
import org.springframework.transaction.annotation.Propagation;

/**
 * One seller authorization per organizer and environment; secrets never cross this adapter in ciphertext.
 */
public class PostgresPaymentAccountStore
        implements PaymentAccountStore,
                SellerCredentialReader,
                PaymentCredentialRenewalStore {
    private final JdbcTemplate jdbc;
    private final PaymentCredentialCipher cipher;
    private final Environment environment;

    public PostgresPaymentAccountStore(JdbcTemplate jdbc, PaymentCredentialCipher cipher) {
        this(jdbc, cipher, Environment.SANDBOX);
    }

    public PostgresPaymentAccountStore(
            JdbcTemplate jdbc, PaymentCredentialCipher cipher, Environment environment) {
        this.environment = Objects.requireNonNull(environment);
        this.jdbc = jdbc;
        this.cipher = cipher;
    }

    @Override
    @Transactional
    public void begin(UUID ownerId, String stateHash, String verifier, Instant expiresAt) {
        begin(ownerId, stateHash, verifier, expiresAt, false);
    }

    @Override
    @Transactional
    public void begin(UUID ownerId, String stateHash, String verifier, Instant expiresAt, boolean returnToApp) {
        jdbc.update(
                """
                INSERT INTO payment_accounts (owner_id, provider, environment, pending_state_hash)
                VALUES (?, 'MERCADO_PAGO', '%s', ?)
                ON CONFLICT (owner_id, provider, environment) DO UPDATE
                SET pending_state_hash=excluded.pending_state_hash, updated_at=now()
                """
                        .formatted(environment.name()),
                ownerId,
                stateHash);
        jdbc.update(
                "DELETE FROM payment_connection_attempts WHERE owner_id=? AND environment=?",
                ownerId,
                environment.name());
        jdbc.update(
                """
                INSERT INTO payment_connection_attempts (owner_id,state_hash,verifier_ciphertext,expires_at,environment,return_to_app)
                VALUES (?,?,?,?,'%s',?)
                """
                        .formatted(environment.name()),
                ownerId,
                stateHash,
                cipher.encrypt(verifier, context(ownerId, "verifier")),
                Timestamp.from(expiresAt), returnToApp);
    }

    @Override
    public Optional<ConnectionAttempt> findPending(String stateHash, Instant now) {
        return jdbc.query("""
                SELECT owner_id,return_to_app FROM payment_connection_attempts
                WHERE state_hash=? AND environment=? AND expires_at>?
                """, (row, index) -> new ConnectionAttempt(row.getObject("owner_id", UUID.class),
                row.getBoolean("return_to_app")), stateHash, environment.name(), Timestamp.from(now))
                .stream().findFirst();
    }

    @Override
    @Transactional
    public Optional<String> consume(UUID ownerId, String stateHash, Instant now) {
        return jdbc
                .query(
                        """
DELETE FROM payment_connection_attempts WHERE owner_id=? AND environment='%s' AND state_hash=? AND expires_at>?
RETURNING verifier_ciphertext
                """
                                .formatted(environment.name()),
                        (row, index) ->
                                cipher.decrypt(row.getString(1), context(ownerId, "verifier")),
                        ownerId,
                        stateHash,
                        Timestamp.from(now))
                .stream()
                .findFirst();
    }

    @Override
    @Transactional
    public boolean complete(UUID ownerId, String stateHash, SellerCredentials credentials) {
        var existing = jdbc.query("""
                SELECT seller_id FROM payment_accounts
                WHERE owner_id=? AND provider='MERCADO_PAGO' AND environment=? AND pending_state_hash=?
                FOR UPDATE
                """, (row, index) -> Objects.requireNonNullElse(row.getString(1), ""),
                ownerId, environment.name(), stateHash);
        if (existing.isEmpty()) {
            return false;
        }
        if (!existing.getFirst().isEmpty() && !existing.getFirst().equals(credentials.sellerId())
                && Boolean.TRUE.equals(jdbc.queryForObject("""
                    SELECT EXISTS(SELECT 1 FROM payment_checkout_attempts
                        WHERE organizer_id=? AND environment=? AND seller_id=?)
                    """, Boolean.class, ownerId, environment.name(), existing.getFirst()))) {
            // Retain the authorization needed for historical reconciliation and refunds.
            throw new BusinessRuleViolationException(
                    "PAYMENT_ACCOUNT_HAS_OPERATIONS", "Esta cuenta tiene operaciones asociadas. Reconectá la misma cuenta o contactá a soporte para cambiarla.");
        }
        return jdbc.update(
                        """
UPDATE payment_accounts SET seller_id=?, access_token_ciphertext=?, refresh_token_ciphertext=?,
expires_at=?, pending_state_hash=NULL, updated_at=now(), reconnect_required=false, reconnect_notified_for=NULL,
renewal_lease_id=NULL,renewal_lease_until=NULL,renewal_retry_at=now()
WHERE owner_id=? AND provider='MERCADO_PAGO' AND environment='%s' AND pending_state_hash=?
                """
                                .formatted(environment.name()),
                        credentials.sellerId(),
                        cipher.encrypt(credentials.accessToken(), context(ownerId, "access")),
                        cipher.encrypt(credentials.refreshToken(), context(ownerId, "refresh")),
                        Timestamp.from(credentials.expiresAt()),
                        ownerId,
                        stateHash)
                == 1;
    }

    @Override
    @Transactional
    public Optional<SellerCredentials> findCredentials(UUID organizerId) {
        return jdbc
                .query(
                        """
SELECT seller_id,access_token_ciphertext,refresh_token_ciphertext,expires_at
FROM payment_accounts WHERE owner_id=? AND provider='MERCADO_PAGO'
AND environment='%s' AND expires_at IS NOT NULL AND NOT reconnect_required
FOR SHARE
                """
                                .formatted(environment.name()),
                        (row, index) ->
                                new SellerCredentials(
                                        row.getString("seller_id"),
                                        cipher.decrypt(
                                                row.getString("access_token_ciphertext"),
                                                context(organizerId, "access")),
                                        cipher.decrypt(
                                                row.getString("refresh_token_ciphertext"),
                                                context(organizerId, "refresh")),
                                        row.getTimestamp("expires_at").toInstant()),
                        organizerId)
                .stream()
                .findFirst();
    }

    @Override
    public Optional<Instant> authorizationExpiry(UUID ownerId) {
        return jdbc
                .query(
                        """
SELECT expires_at FROM payment_accounts WHERE owner_id=? AND provider='MERCADO_PAGO'
AND environment='%s' AND expires_at IS NOT NULL AND NOT reconnect_required
                """
                                .formatted(environment.name()),
                        (row, index) -> row.getTimestamp(1).toInstant(),
                        ownerId)
                .stream()
                .findFirst();
    }

    @Override
    @Transactional(
            propagation = Propagation.REQUIRES_NEW)
    public Optional<CredentialRenewalClaim> claim(
            Instant now, Instant renewBefore) {
        UUID lease = UUID.randomUUID();
        return jdbc
                .query(
                        """
WITH candidate AS (
    SELECT owner_id FROM payment_accounts WHERE environment=? AND provider='MERCADO_PAGO'
    AND expires_at <= ? AND NOT reconnect_required AND renewal_retry_at <= ?
    AND (renewal_lease_until IS NULL OR renewal_lease_until <= ?)
    ORDER BY expires_at,owner_id FOR UPDATE SKIP LOCKED LIMIT 1
)
UPDATE payment_accounts a SET renewal_lease_id=?,renewal_lease_until=?
FROM candidate c WHERE a.owner_id=c.owner_id AND a.environment=? AND a.provider='MERCADO_PAGO'
RETURNING a.owner_id,a.seller_id,a.access_token_ciphertext,a.refresh_token_ciphertext,a.expires_at
                """,
                        (row, index) -> {
                            UUID owner = row.getObject("owner_id", UUID.class);
                            return new CredentialRenewalClaim(
                                    owner,
                                    lease,
                                    new SellerCredentials(
                                            row.getString("seller_id"),
                                            cipher.decrypt(
                                                    row.getString("access_token_ciphertext"),
                                                    context(owner, "access")),
                                            cipher.decrypt(
                                                    row.getString("refresh_token_ciphertext"),
                                                    context(owner, "refresh")),
                                            row.getTimestamp("expires_at").toInstant()));
                        },
                        environment.name(),
                        Timestamp.from(renewBefore),
                        Timestamp.from(now),
                        Timestamp.from(now),
                        lease,
                        Timestamp.from(now.plus(Duration.ofMinutes(1))),
                        environment.name())
                .stream()
                .findFirst();
    }

    @Override
    @Transactional
    public boolean complete(
            CredentialRenewalClaim claim,
            SellerCredentials credentials) {
        return jdbc.update(
                        """
UPDATE payment_accounts SET access_token_ciphertext=?,refresh_token_ciphertext=?,expires_at=?,
renewal_lease_id=NULL,renewal_lease_until=NULL,renewal_retry_at=now()+interval '5 minutes',reconnect_required=false,reconnect_notified_for=NULL,updated_at=now()
                WHERE owner_id=? AND environment=? AND provider='MERCADO_PAGO' AND renewal_lease_id=? AND seller_id=?
                """,
                        cipher.encrypt(
                                credentials.accessToken(), context(claim.ownerId(), "access")),
                        cipher.encrypt(
                                credentials.refreshToken(), context(claim.ownerId(), "refresh")),
                        Timestamp.from(credentials.expiresAt()),
                        claim.ownerId(),
                        environment.name(),
                        claim.leaseId(),
                        credentials.sellerId())
                == 1;
    }

    @Override
    @Transactional
    public boolean fail(
            CredentialRenewalClaim claim,
            Instant retryAt,
            boolean reconnectRequired) {
        return jdbc.update(
                """
                UPDATE payment_accounts SET renewal_lease_id=NULL,renewal_lease_until=NULL,renewal_retry_at=?,reconnect_required=?
                WHERE owner_id=? AND environment=? AND provider='MERCADO_PAGO' AND renewal_lease_id=?
                """,
                Timestamp.from(retryAt),
                reconnectRequired,
                claim.ownerId(),
                environment.name(),
                claim.leaseId())
                == 1;
    }

    @Override
    @Transactional
    public boolean markReconnectNotified(CredentialRenewalClaim claim) {
        Timestamp expiry = Timestamp.from(claim.credentials().expiresAt());
        return jdbc.update(
                        """
                UPDATE payment_accounts SET reconnect_notified_for=?
                WHERE owner_id=? AND environment=? AND provider='MERCADO_PAGO' AND seller_id=? AND expires_at=?
                AND reconnect_notified_for IS DISTINCT FROM ?
                """,
                        expiry,
                        claim.ownerId(),
                        environment.name(),
                        claim.credentials().sellerId(),
                        expiry,
                        expiry)
                == 1;
    }

    private String context(UUID ownerId, String purpose) {
        // Existing sandbox ciphertext remains readable; live ciphertext is bound to its
        // environment.
        return ownerId
                + ":"
                + (environment == Environment.SANDBOX ? "" : environment.name() + ":")
                + purpose;
    }
}
