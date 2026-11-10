package com.vinnot.payment.infrastructure.persistence;

import com.vinnot.payment.application.port.out.PaymentAccountStore;
import com.vinnot.payment.application.port.out.SellerCredentialReader;
import com.vinnot.payment.domain.model.SellerCredentials;
import com.vinnot.payment.infrastructure.security.PaymentCredentialCipher;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import com.vinnot.payment.application.port.out.PaymentCredentialRenewalStore;
import com.vinnot.payment.application.service.PaymentExecutionPolicy;
import com.vinnot.payment.infrastructure.config.PaymentSandboxConfiguration;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import java.sql.Timestamp;
import java.time.temporal.ChronoUnit;
import org.springframework.dao.DataIntegrityViolationException;
import com.vinnot.payment.application.service.PaymentAccountNoticeService;
import com.vinnot.payment.application.service.PaymentAccountNoticeService.ReconnectReason;
import com.vinnot.payment.application.service.RenewalFailureRecorder;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers(disabledWithoutDocker = true)
class PostgresPaymentAccountStoreTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static JdbcTemplate jdbc;
    private static PaymentAccountStore store;
    private static TransactionInterceptor transactions;
    private static final Instant NOW = Instant.parse("2026-10-14T12:00:00Z");

    @BeforeAll
    static void setup() {
        var source = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        jdbc = new JdbcTemplate(source);
        jdbc.execute("CREATE TABLE users (id uuid PRIMARY KEY)");
        jdbc.execute("CREATE TABLE events(id uuid PRIMARY KEY)");
        jdbc.execute("CREATE TABLE event_registrations(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz)");
        new ResourceDatabasePopulator(new ClassPathResource("db/migration/V29__payment_sandbox_accounts.sql"),
                new ClassPathResource("db/migration/V30__durable_checkout_attempts.sql"),
                new ClassPathResource("db/migration/V33__payment_live_pilot_environment.sql"),
                new ClassPathResource("db/migration/V34__payment_credential_renewal.sql"),
                new ClassPathResource("db/migration/V36__payment_connection_return_channel.sql"),
                new ClassPathResource("db/migration/V58__payment_reconnect_notice.sql")).execute(source);
        var target = new PostgresPaymentAccountStore(jdbc,
                new PaymentCredentialCipher(Base64.getEncoder().encodeToString(new byte[32])));
        transactions = new TransactionInterceptor();
        transactions.setTransactionManager(new DataSourceTransactionManager(source));
        transactions.setTransactionAttributeSource(new AnnotationTransactionAttributeSource());
        var factory = new ProxyFactory(target);
        factory.addAdvice(transactions);
        store = (PaymentAccountStore) factory.getProxy();
    }

    @Test
    void aReconnectNoticeThatCannotBeQueuedRecordsNothingSoALaterRunRetries() {
        jdbc.update("UPDATE payment_accounts SET reconnect_required=true");
        UUID id = owner();
        store.begin(id, "atomic-notice", "proof", NOW.plusSeconds(600));
        assertThat(store.complete(id, "atomic-notice", credentials())).isTrue();
        var renewals = (PaymentCredentialRenewalStore) store;
        Instant current = Instant.now().truncatedTo(ChronoUnit.MICROS).plusSeconds(1);
        var claim = renewals.claim(current, current.plusSeconds(86400)).orElseThrow();
        var notices = mock(PaymentAccountNoticeService.class);
        doThrow(new IllegalStateException("outbox down")).when(notices).reconnectRequired(any(), any(), any());
        var factory = new ProxyFactory(new RenewalFailureRecorder(renewals, notices));
        factory.setProxyTargetClass(true);
        factory.addAdvice(transactions);
        var recorder = (RenewalFailureRecorder) factory.getProxy();

        assertThatThrownBy(() -> recorder.revoked(claim, current)).isInstanceOf(IllegalStateException.class);
        assertThat(jdbc.queryForObject("""
                SELECT reconnect_notified_for IS NULL AND NOT reconnect_required AND renewal_lease_id IS NOT NULL
                FROM payment_accounts WHERE owner_id=?
                """, Boolean.class, id)).as("the failure, its mark and the notice roll back together").isTrue();

        reset(notices);
        recorder.revoked(claim, current);
        verify(notices).reconnectRequired(id, ReconnectReason.REVOKED, claim.credentials().expiresAt());
        assertThat(jdbc.queryForObject("""
                SELECT reconnect_notified_for IS NOT NULL AND reconnect_required FROM payment_accounts WHERE owner_id=?
                """, Boolean.class, id)).isTrue();
    }

    @Test
    void pendingCallbackLookupIsExpiringEnvironmentBoundAndSingleUse() {
        UUID owner = owner();
        store.begin(owner, "callback-state", "v", NOW.plusSeconds(600), true);
        assertThat(store.findPending("callback-state", NOW)).contains(new PaymentAccountStore.ConnectionAttempt(owner, true));
        assertThat(store.findPending("callback-state", NOW.plusSeconds(600))).isEmpty();
        assertThat(store.findPending("unknown", NOW)).isEmpty();
        store.consume(owner, "callback-state", NOW);
        assertThat(store.findPending("callback-state", NOW)).isEmpty();
    }

    @Test
    void renewalLeasesFenceConcurrentWorkersAndManualReconnections() throws Exception {
        jdbc.update("UPDATE payment_accounts SET reconnect_required=true");
        UUID id = owner(); store.begin(id,"renew-state","proof",NOW.plusSeconds(600));
        assertThat(store.complete(id,"renew-state",credentials())).isTrue();
        var renewals = (PaymentCredentialRenewalStore) store;
        // PostgreSQL timestamptz stores microseconds; Linux clocks may expose nanoseconds.
        Instant current = Instant.now().truncatedTo(ChronoUnit.MICROS).plusSeconds(1);
        var start = new CountDownLatch(1);
        try(var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var first=executor.submit(()->{start.await();return renewals.claim(current,current.plusSeconds(86400));});
            var second=executor.submit(()->{start.await();return renewals.claim(current,current.plusSeconds(86400));});
            start.countDown(); var a=first.get(10,TimeUnit.SECONDS); var b=second.get(10,TimeUnit.SECONDS);
            assertThat(a.isPresent() ^ b.isPresent()).isTrue();
            var claim=a.orElseGet(b::orElseThrow);
            var rotated=new SellerCredentials("123","new-access","new-refresh",current.plusSeconds(3600));
            assertThat(renewals.complete(claim,rotated)).isTrue();
            assertThat(renewals.complete(claim,credentials())).isFalse();
            assertThat(((SellerCredentialReader)store).findCredentials(id)).contains(rotated);
            jdbc.update("UPDATE payment_accounts SET renewal_retry_at=? WHERE owner_id=?",Timestamp.from(current),id);
            var stale=renewals.claim(current,current.plusSeconds(86400)).orElseThrow();
            store.begin(id,"reconnect","proof",current.plusSeconds(600));
            assertThat(store.complete(id,"reconnect",credentials())).isTrue();
            assertThat(renewals.complete(stale,rotated)).isFalse();
            assertThat(renewals.fail(stale,current,true)).isFalse();
            assertThat(((SellerCredentialReader)store).findCredentials(id)).contains(credentials());
        }
    }

    @Test
    void aConnectionIsNoticedOnceUntilItIsReplaced() {
        jdbc.update("UPDATE payment_accounts SET reconnect_required=true");
        UUID id = owner();
        store.begin(id, "notice-state", "proof", NOW.plusSeconds(600));
        assertThat(store.complete(id, "notice-state", credentials())).isTrue();
        var renewals = (PaymentCredentialRenewalStore) store;
        Instant current = Instant.now().truncatedTo(ChronoUnit.MICROS).plusSeconds(1);
        var claim = renewals.claim(current, current.plusSeconds(86400)).orElseThrow();
        assertThat(renewals.fail(claim, current, false)).isTrue();
        assertThat(renewals.markReconnectNotified(claim)).isTrue();
        assertThat(renewals.markReconnectNotified(claim)).as("already noticed").isFalse();

        store.begin(id, "notice-again", "proof", NOW.plusSeconds(600));
        assertThat(store.complete(id, "notice-again", new SellerCredentials("123", "a2", "r2", NOW.plusSeconds(7200)))).isTrue();
        assertThat(renewals.markReconnectNotified(claim)).as("that connection was replaced").isFalse();
        var next = renewals.claim(current, current.plusSeconds(86400)).orElseThrow();
        assertThat(renewals.markReconnectNotified(next)).as("a new connection can be noticed").isTrue();
    }

    @Test
    void liveAndSandboxCredentialsAndOAuthAttemptsAreIsolated() {
        UUID owner = owner();
        var live = new PostgresPaymentAccountStore(jdbc,
                new PaymentCredentialCipher(Base64.getEncoder().encodeToString(new byte[32])),
                PaymentExecutionPolicy.Environment.LIVE_PILOT);
        store.begin(owner, "sandbox-state", "sandbox-proof", NOW.plusSeconds(600));
        live.begin(owner, "live-state", "live-proof", NOW.plusSeconds(600));
        assertThat(live.consume(owner, "sandbox-state", NOW)).isEmpty();
        assertThat(store.consume(owner, "live-state", NOW)).isEmpty();
        assertThat(live.consume(owner, "live-state", NOW)).contains("live-proof");
        assertThat(live.complete(owner, "live-state", credentials())).isTrue();
        assertThat(store.authorizationExpiry(owner)).isEmpty();
        assertThat(store.consume(owner, "sandbox-state", NOW)).contains("sandbox-proof");
        assertThat(store.complete(owner, "sandbox-state", credentials())).isTrue();
        assertThat(live.findCredentials(owner)).contains(credentials());
        var production = new PaymentSandboxConfiguration().paymentAccountStore(jdbc,
                Base64.getEncoder().encodeToString(new byte[32]),
                new PaymentExecutionPolicy(
                        PaymentExecutionPolicy.Environment.LIVE, "", "999"));
        assertThat(production.findCredentials(owner)).contains(credentials());
        production.begin(owner, "production-state", "production-proof", NOW.plusSeconds(600), true);
        assertThat(live.consume(owner, "production-state", NOW)).contains("production-proof");
        assertThat(production.complete(owner, "production-state", credentials())).isTrue();
        assertThat(live.findCredentials(owner)).contains(credentials());
        jdbc.update("UPDATE payment_accounts SET access_token_ciphertext=(SELECT access_token_ciphertext FROM payment_accounts WHERE owner_id=? AND environment='SANDBOX') WHERE owner_id=? AND environment='LIVE_PILOT'", owner, owner);
        assertThatThrownBy(() -> live.findCredentials(owner)).isInstanceOf(RuntimeException.class);
    }

    @Test
    void onlyTheOwnerCanConsumeAnUnexpiredAttemptOnceAndSecretsAreEncrypted() {
        UUID owner = owner();
        store.begin(owner, "first", "secret-verifier", NOW.plusSeconds(600));
        assertThat(store.authorizationExpiry(owner)).isEmpty();
        assertThat(((SellerCredentialReader) store).findCredentials(owner)).isEmpty();
        assertThat(store.consume(UUID.randomUUID(), "first", NOW)).isEmpty();
        assertThat(jdbc.queryForObject("SELECT verifier_ciphertext FROM payment_connection_attempts WHERE owner_id=?", String.class, owner))
                .startsWith("v1:").doesNotContain("secret-verifier");
        assertThat(store.consume(owner, "first", NOW)).contains("secret-verifier");
        assertThat(store.consume(owner, "first", NOW)).isEmpty();
        assertThat(store.complete(owner, "first", credentials())).isTrue();
        assertThat(store.complete(owner, "first", credentials())).isFalse();
        assertThat(store.authorizationExpiry(owner)).contains(NOW.plusSeconds(3600));
        assertThat(((SellerCredentialReader) store).findCredentials(owner)).contains(credentials());
        assertThat(((SellerCredentialReader) store).findCredentials(UUID.randomUUID())).isEmpty();
        var row = jdbc.queryForMap("SELECT access_token_ciphertext,refresh_token_ciphertext FROM payment_accounts WHERE owner_id=?", owner);
        assertThat(row.values()).allMatch(value -> value.toString().startsWith("v1:"));
        assertThat(row.toString()).doesNotContain("access-secret", "refresh-secret");
        store.begin(owner, "expired", "v", NOW);
        assertThat(store.consume(owner, "expired", NOW)).isEmpty();
    }

    @Test
    void aNewAttemptInvalidatesOldProofAndLateCompletionCannotOverwriteIt() {
        UUID owner = owner();
        store.begin(owner, "old", "old-verifier", NOW.plusSeconds(600));
        assertThat(store.consume(owner, "old", NOW)).isPresent();
        store.begin(owner, "new", "new-verifier", NOW.plusSeconds(600));
        assertThat(store.complete(owner, "old", credentials())).isFalse();
        assertThat(store.consume(owner, "new", NOW)).contains("new-verifier");
        assertThat(store.complete(owner, "new", credentials())).isTrue();
        store.begin(owner, "newest", "v", NOW.plusSeconds(600));
        store.begin(owner, owner + "r", "v", NOW.plusSeconds(600));
        assertThat(store.consume(owner, "newest", NOW)).isEmpty();
        assertThat(store.authorizationExpiry(owner)).isPresent();
    }

    @Test
    void concurrentCallbacksHaveExactlyOneWinner() throws Exception {
        UUID owner = owner();
        store.begin(owner, "concurrent", "v", NOW.plusSeconds(600));
        var start = new CountDownLatch(1);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var first = executor.submit(() -> { start.await(); return store.consume(owner, "concurrent", NOW).isPresent(); });
            var second = executor.submit(() -> { start.await(); return store.consume(owner, "concurrent", NOW).isPresent(); });
            start.countDown();
            assertThat(first.get(10, TimeUnit.SECONDS) ^ second.get(10, TimeUnit.SECONDS)).isTrue();
        }
    }

    @Test
    void failedReplacementRollsBackBothAccountAndAttempt() {
        UUID first = owner();
        UUID second = owner();
        store.begin(first, "occupied-hash", "v", NOW.plusSeconds(600));
        store.begin(second, "previous-hash", "v", NOW.plusSeconds(600));
        assertThatThrownBy(() -> store.begin(second, "occupied-hash", "v", NOW.plusSeconds(600)))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThat(store.consume(second, "previous-hash", NOW)).isPresent();
        assertThat(store.complete(second, "previous-hash", credentials())).isTrue();
    }

    @Test
    void accountWithCheckoutHistoryCannotLoseItsRefundAuthorization() {
        UUID owner = owner();
        store.begin(owner, owner + "o", "v", NOW.plusSeconds(600));
        store.complete(owner, owner + "o", credentials());
        UUID event = UUID.randomUUID(); UUID registration = UUID.randomUUID();
        jdbc.update("INSERT INTO events(id) VALUES (?)", event);
        jdbc.update("INSERT INTO event_registrations(id,user_id,created_at) VALUES (?,?,now())", registration, owner);
        jdbc.update("""
                INSERT INTO payment_checkout_attempts(id,registration_id,event_id,buyer_id,organizer_id,seller_id,
                title,unit_price,quantity,currency,total_amount,commission_amount,commission_basis_points,commission_policy,expires_at)
                VALUES (?,?,?,?,?,'123','Tasting',50,1,'ARS',50,1.50,300,'VINNOT_3_PERCENT_V1',now()+interval '1 hour')
                """, UUID.randomUUID(), registration, event, owner, owner);
        store.begin(owner, owner + "r", "v", NOW.plusSeconds(600));
        assertThatThrownBy(() -> store.complete(owner, owner + "r", new SellerCredentials("456", "new", "refresh", NOW.plusSeconds(3600))))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code").isEqualTo("PAYMENT_ACCOUNT_HAS_OPERATIONS");
        assertThat(((SellerCredentialReader) store).findCredentials(owner)).contains(credentials());
        // Reauthorizing the original seller remains available even with history.
        assertThat(store.complete(owner, owner + "r", credentials())).isTrue();
    }

    @Test
    void accountWithoutCheckoutHistoryCanChooseAnotherSeller() {
        UUID owner = owner();
        store.begin(owner, owner + "o", "v", NOW.plusSeconds(600));
        store.complete(owner, owner + "o", credentials());
        store.begin(owner, owner + "r", "v", NOW.plusSeconds(600));
        var replacement = new SellerCredentials("456", "new", "refresh", NOW.plusSeconds(3600));
        assertThat(store.complete(owner, owner + "r", replacement)).isTrue();
        assertThat(((SellerCredentialReader) store).findCredentials(owner)).contains(replacement);
    }

    private static UUID owner() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id) VALUES (?)", id);
        return id;
    }

    private static SellerCredentials credentials() {
        return new SellerCredentials("123", "access-secret", "refresh-secret", NOW.plusSeconds(3600));
    }
}
