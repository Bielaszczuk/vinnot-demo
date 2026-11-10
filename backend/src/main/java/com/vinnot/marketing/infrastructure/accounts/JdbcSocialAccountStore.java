package com.vinnot.marketing.infrastructure.accounts;

import com.vinnot.marketing.application.exception.UnreadableSocialAccountException;
import com.vinnot.marketing.application.model.SocialAccountGrant;
import com.vinnot.marketing.application.model.SocialAccountRefreshClaim;
import com.vinnot.marketing.application.model.SocialAccountSummary;
import com.vinnot.marketing.application.port.out.SocialAccountStore;
import com.vinnot.marketing.domain.model.SocialAccount;
import com.vinnot.marketing.domain.model.SocialAccountStatus;
import com.vinnot.marketing.domain.model.SocialNetwork;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * The {@code social_accounts} table (#510 S5): one row per OAuth network, tokens encrypted with {@link SocialAccountCipher}
 * bound to the network and the field. A refresh lease is the {@code refresh_claimed_until} instant itself: one
 * conditional update takes it, and every later mark must name it, so a lost lease (expired, or the account was
 * reconnected meanwhile) changes nothing. A leased account whose tokens cannot be decrypted (a rotated key) is marked
 * REFRESH_FAILED with {@link UnreadableSocialAccountException#CODE} at once, never with the cause's message.
 */
public class JdbcSocialAccountStore implements SocialAccountStore {
    static final Duration LEASE = Duration.ofMinutes(5);
    private static final String ACCESS = "access";
    private static final String REFRESH = "refresh";
    private final JdbcTemplate jdbc;
    private final SocialAccountCipher cipher;

    public JdbcSocialAccountStore(JdbcTemplate jdbc, SocialAccountCipher cipher) {
        this.jdbc = jdbc;
        this.cipher = cipher;
    }

    @Override
    public boolean encryptionReady() {
        return cipher.available();
    }

    @Override
    public void connect(SocialNetwork network, SocialAccountGrant grant, UUID connectedBy, Instant now) {
        jdbc.update("""
                INSERT INTO social_accounts (network, account_id, display_name, access_token_ciphertext, refresh_token_ciphertext,
                    access_expires_at, refresh_expires_at, status, last_error, connected_by, connected_at, updated_at, refresh_claimed_until)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'CONNECTED', NULL, ?, ?, ?, NULL)
                ON CONFLICT (network) DO UPDATE SET account_id = EXCLUDED.account_id, display_name = EXCLUDED.display_name,
                    access_token_ciphertext = EXCLUDED.access_token_ciphertext, refresh_token_ciphertext = EXCLUDED.refresh_token_ciphertext,
                    access_expires_at = EXCLUDED.access_expires_at, refresh_expires_at = EXCLUDED.refresh_expires_at, status = 'CONNECTED',
                    last_error = NULL, connected_by = EXCLUDED.connected_by, connected_at = EXCLUDED.connected_at,
                    updated_at = EXCLUDED.updated_at, refresh_claimed_until = NULL
                """, network.name(), grant.accountId(), grant.displayName(), cipher.encrypt(grant.accessToken(), context(network, ACCESS)),
                encryptOptional(grant.refreshToken(), network), timestamp(grant.accessExpiresAt()), timestamp(grant.refreshExpiresAt()),
                connectedBy, Timestamp.from(now), Timestamp.from(now));
    }

    @Override
    public Optional<SocialAccount> find(SocialNetwork network) {
        return jdbc.query("""
                SELECT network, account_id, display_name, access_token_ciphertext, refresh_token_ciphertext, access_expires_at,
                    refresh_expires_at, status, last_error, connected_by, connected_at, updated_at
                FROM social_accounts WHERE network = ?
                """, (row, index) -> new SocialAccount(network, row.getString("account_id"), row.getString("display_name"),
                cipher.decrypt(row.getString("access_token_ciphertext"), context(network, ACCESS)),
                decryptOptional(row.getString("refresh_token_ciphertext"), network), instant(row, "access_expires_at"),
                instant(row, "refresh_expires_at"), SocialAccountStatus.valueOf(row.getString("status")), row.getString("last_error"),
                row.getObject("connected_by", UUID.class), instant(row, "connected_at"), instant(row, "updated_at")), network.name())
                .stream().findFirst();
    }

    @Override
    public List<SocialAccountSummary> summaries() {
        return jdbc.query("""
                SELECT network, account_id, display_name, status, access_expires_at, refresh_expires_at, last_error, connected_at
                FROM social_accounts ORDER BY network
                """, (row, index) -> new SocialAccountSummary(SocialNetwork.valueOf(row.getString("network")), row.getString("account_id"),
                row.getString("display_name"), SocialAccountStatus.valueOf(row.getString("status")), instant(row, "access_expires_at"),
                instant(row, "refresh_expires_at"), row.getString("last_error"), instant(row, "connected_at")));
    }

    @Override
    public boolean delete(SocialNetwork network) {
        return jdbc.update("DELETE FROM social_accounts WHERE network = ?", network.name()) == 1;
    }

    @Override
    public Optional<SocialAccountRefreshClaim> claimDueForRefresh(SocialNetwork network, Instant now, Instant renewBefore,
            Instant writtenBefore) {
        // Postgres keeps microseconds: the lease must round-trip exactly to identify the claim later.
        Instant until = now.plus(LEASE).truncatedTo(ChronoUnit.MICROS);
        Optional<LeasedRow> leased = jdbc.query("""
                UPDATE social_accounts SET refresh_claimed_until = ?
                WHERE network = ? AND status = 'CONNECTED' AND access_expires_at IS NOT NULL AND access_expires_at <= ?
                    AND updated_at <= ? AND (refresh_claimed_until IS NULL OR refresh_claimed_until <= ?)
                RETURNING account_id, access_token_ciphertext, refresh_token_ciphertext, access_expires_at, refresh_expires_at
                """, (row, index) -> new LeasedRow(row.getString("account_id"), row.getString("access_token_ciphertext"),
                instant(row, "access_expires_at"), row.getString("refresh_token_ciphertext"), instant(row, "refresh_expires_at")),
                Timestamp.from(until), network.name(), Timestamp.from(renewBefore), Timestamp.from(writtenBefore), Timestamp.from(now))
                .stream().findFirst();
        if (leased.isEmpty()) {
            return Optional.empty();
        }
        LeasedRow row = leased.get();
        try {
            return Optional.of(new SocialAccountRefreshClaim(network, until, row.accountId(),
                    cipher.decrypt(row.accessCiphertext(), context(network, ACCESS)), row.accessExpiresAt(),
                    decryptOptional(row.refreshCiphertext(), network), row.refreshExpiresAt()));
        } catch (IllegalStateException unreadable) {
            throw new UnreadableSocialAccountException(network, markFailed(network, until, UnreadableSocialAccountException.CODE));
        }
    }

    @Override
    public boolean markRefreshed(SocialAccountRefreshClaim claim, SocialAccountGrant grant, Instant now) {
        return jdbc.update("""
                UPDATE social_accounts SET access_token_ciphertext = ?, refresh_token_ciphertext = COALESCE(?, refresh_token_ciphertext),
                    access_expires_at = ?, refresh_expires_at = COALESCE(?, refresh_expires_at), status = 'CONNECTED', last_error = NULL,
                    updated_at = ?, refresh_claimed_until = NULL
                WHERE network = ? AND refresh_claimed_until = ? AND status = 'CONNECTED' AND account_id = ?
                """, cipher.encrypt(grant.accessToken(), context(claim.network(), ACCESS)), encryptOptional(grant.refreshToken(), claim.network()),
                timestamp(grant.accessExpiresAt()), timestamp(grant.refreshExpiresAt()), Timestamp.from(now), claim.network().name(),
                Timestamp.from(claim.claimedUntil()), claim.accountId()) == 1;
    }

    @Override
    public boolean markRefreshFailed(SocialAccountRefreshClaim claim, String errorCode) {
        return markFailed(claim.network(), claim.claimedUntil(), errorCode);
    }

    private boolean markFailed(SocialNetwork network, Instant claimedUntil, String errorCode) {
        return jdbc.update("""
                UPDATE social_accounts SET status = 'REFRESH_FAILED', last_error = ?, refresh_claimed_until = NULL
                WHERE network = ? AND refresh_claimed_until = ? AND status = 'CONNECTED'
                """, errorCode, network.name(), Timestamp.from(claimedUntil)) == 1;
    }

    @Override
    public void releaseClaim(SocialAccountRefreshClaim claim, String errorCode) {
        jdbc.update("""
                UPDATE social_accounts SET last_error = ?, refresh_claimed_until = NULL WHERE network = ? AND refresh_claimed_until = ?
                """, errorCode, claim.network().name(), Timestamp.from(claim.claimedUntil()));
    }

    private String encryptOptional(String token, SocialNetwork network) {
        return Objects.isNull(token) ? null : cipher.encrypt(token, context(network, REFRESH));
    }

    private String decryptOptional(String envelope, SocialNetwork network) {
        return Objects.isNull(envelope) ? null : cipher.decrypt(envelope, context(network, REFRESH));
    }

    static String context(SocialNetwork network, String field) {
        return "marketing:social-account:" + network.name() + ":" + field;
    }

    private static Timestamp timestamp(Instant instant) {
        return Objects.isNull(instant) ? null : Timestamp.from(instant);
    }

    /** A leased account as stored, its tokens still encrypted. */
    private record LeasedRow(String accountId, String accessCiphertext, Instant accessExpiresAt, String refreshCiphertext,
            Instant refreshExpiresAt) {
    }

    private static Instant instant(ResultSet row, String column) throws SQLException {
        Timestamp value = row.getTimestamp(column);
        return Objects.isNull(value) ? null : value.toInstant();
    }
}
