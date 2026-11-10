package com.vinnot.payment.infrastructure.persistence;

import com.vinnot.payment.application.port.out.CheckoutAttemptStore;
import com.vinnot.payment.application.port.out.TicketCheckoutGateway;
import com.vinnot.payment.application.service.DispatchTicketCheckoutService;
import com.vinnot.payment.domain.model.CheckoutAttempt;
import com.vinnot.payment.domain.model.CheckoutSnapshot;
import com.vinnot.payment.domain.model.ProviderPayment;
import com.vinnot.payment.domain.model.SellerCredentials;
import com.vinnot.payment.domain.valueobject.CommissionPolicy;
import com.vinnot.payment.domain.valueobject.TicketPaymentQuote;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import com.vinnot.payment.application.service.PaymentExecutionPolicy;
import static org.assertj.core.api.Assertions.*;

@Testcontainers(disabledWithoutDocker = true)
class PostgresCheckoutAttemptStoreTest {
    private static final CommissionPolicy THREE_PERCENT = new CommissionPolicy(300, "VINNOT_3_PERCENT_V1");
    private static final CommissionPolicy EIGHT_PERCENT = new CommissionPolicy(800, "VINNOT_8_PERCENT_V1");
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static JdbcTemplate jdbc;
    private static CheckoutAttemptStore store;
    private static TransactionTemplate transaction;
    private static final Instant NOW = Instant.parse("2026-10-14T12:00:00Z");
    private static final URI URL = URI.create("https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=test");

    @BeforeAll
    static void setup() {
        var source = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        jdbc = new JdbcTemplate(source);
        jdbc.execute("CREATE TABLE users(id uuid PRIMARY KEY)");
        jdbc.execute("CREATE TABLE events(id uuid PRIMARY KEY)");
        jdbc.execute("CREATE TABLE event_registrations(id uuid PRIMARY KEY)");
        new ResourceDatabasePopulator(new ClassPathResource("db/migration/V29__payment_sandbox_accounts.sql"),
                new ClassPathResource("db/migration/V30__durable_checkout_attempts.sql"),
                new ClassPathResource("db/migration/V33__payment_live_pilot_environment.sql"),
                new ClassPathResource("db/migration/V37__checkout_return_channel.sql")).execute(source);
        // V74 holds a DO block; the populator splits on every semicolon, so the driver runs it as one script.
        jdbc.execute(migration("V74__configurable_commission_policy.sql"));
        jdbc.execute(migration("V77__keep_payment_history_on_account_deletion.sql"));
        var manager = new DataSourceTransactionManager(source);
        transaction = new TransactionTemplate(manager);
        var advice = new TransactionInterceptor();
        advice.setTransactionManager(manager);
        advice.setTransactionAttributeSource(new AnnotationTransactionAttributeSource());
        var factory = new ProxyFactory(new PostgresCheckoutAttemptStore(jdbc));
        factory.addAdvice(advice);
        store = (CheckoutAttemptStore) factory.getProxy();
    }

    @Test
    void preservesOriginalReturnChannelAcrossRetriesAndDispatch() {
        var base = snapshot();
        var nativeSnapshot = new CheckoutSnapshot(base.id(), base.registrationId(), base.eventId(), base.buyerId(),
                base.organizerId(), base.sellerId(), base.title(), base.quote(), base.expiresAt(), true);
        assertThat(store.prepare(nativeSnapshot).returnToApp()).isTrue();
        assertThat(store.prepare(base).returnToApp()).isTrue();
        assertThat(store.find(base.id(), base.buyerId()).orElseThrow().snapshot().returnToApp()).isTrue();
        assertThat(store.claim(base.id(), base.buyerId(), NOW).orElseThrow().returnToApp()).isTrue();
    }

    @Test
    void liveAttemptsCannotBeClaimedReadOrCompletedBySandbox() {
        var live = new PostgresCheckoutAttemptStore(jdbc,
                PaymentExecutionPolicy.Environment.LIVE_PILOT);
        var original = snapshot();
        var snapshot = live.prepare(original);
        assertThat(store.find(snapshot.id(), snapshot.buyerId())).isEmpty();
        assertThat(store.findByRegistration(snapshot.registrationId(), snapshot.buyerId())).isEmpty();
        assertThat(store.claim(snapshot.id(), snapshot.buyerId(), NOW)).isEmpty();
        assertThat(live.claim(snapshot.id(), snapshot.buyerId(), NOW)).contains(snapshot);
        assertThat(store.dispatchedSnapshot(snapshot.id())).isEmpty();
        assertThat(store.needingReconciliation(NOW, 200)).doesNotContain(snapshot.id());
        store.markUncertain(snapshot.id());
        assertThat(store.complete(ready(snapshot))).isFalse();
        assertThat(live.complete(ready(snapshot))).isTrue();
    }

    @Test
    void aNewCheckoutMustNameItsRegistrationEventBuyerAndOrganizer() {
        var linked = snapshot();
        for (int field = 0; field < 4; field++) {
            var missing = new CheckoutSnapshot(UUID.randomUUID(), field == 0 ? null : linked.registrationId(),
                    field == 1 ? null : linked.eventId(), field == 2 ? null : linked.buyerId(),
                    field == 3 ? null : linked.organizerId(), "123", "Cata", linked.quote(), linked.expiresAt());
            assertThatThrownBy(() -> store.prepare(missing)).isInstanceOf(IllegalArgumentException.class);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_checkout_attempts WHERE id=?", Integer.class, missing.id())).isZero();
        }
    }

    @Test
    void deletedAccountsLeaveTheAttemptReadableWithoutItsLinks() {
        var prepared = store.prepare(snapshot());
        store.claim(prepared.id(), prepared.buyerId(), NOW);
        jdbc.update("DELETE FROM event_registrations WHERE id=?", prepared.registrationId());
        jdbc.update("DELETE FROM users WHERE id=?", prepared.buyerId());
        var buyerGone = store.dispatchedSnapshot(prepared.id()).orElseThrow();
        assertThat(buyerGone.linked()).isFalse();
        assertThat(buyerGone.registrationId()).isNull();
        assertThat(buyerGone.buyerId()).isNull();
        assertThat(buyerGone.eventId()).isEqualTo(prepared.eventId());
        assertThat(buyerGone.quote()).isEqualTo(prepared.quote());
        jdbc.update("DELETE FROM events WHERE id=?", prepared.eventId());
        jdbc.update("DELETE FROM users WHERE id=?", prepared.organizerId());
        var orphan = store.dispatchedSnapshot(prepared.id()).orElseThrow();
        assertThat(orphan.eventId()).isNull();
        assertThat(orphan.organizerId()).isNull();
        assertThat(orphan.sellerId()).isEqualTo("123");
        assertThat(store.needingReconciliation(NOW.plusSeconds(1), 200)).contains(prepared.id());
    }

    @Test
    void snapshotsKeepOriginalIdAndTermsAndRollbackWithReservationTransaction() {
        var snapshot = snapshot();
        assertThat(store.prepare(snapshot)).isEqualTo(snapshot);
        var retry = new CheckoutSnapshot(UUID.randomUUID(), snapshot.registrationId(), snapshot.eventId(), snapshot.buyerId(),
                snapshot.organizerId(), snapshot.sellerId(), snapshot.title(), snapshot.quote(), snapshot.expiresAt());
        assertThat(store.prepare(retry)).isEqualTo(snapshot);
        var changed = new CheckoutSnapshot(UUID.randomUUID(), snapshot.registrationId(), snapshot.eventId(), snapshot.buyerId(),
                snapshot.organizerId(), "456", snapshot.title(), snapshot.quote(), snapshot.expiresAt());
        assertThatThrownBy(() -> store.prepare(changed)).isInstanceOf(BusinessRuleViolationException.class);
        assertThat(store.find(snapshot.id(), UUID.randomUUID())).isEmpty();
        assertThat(store.findByRegistration(snapshot.registrationId(), snapshot.buyerId())).contains(snapshot);
        assertThat(store.findByRegistration(snapshot.registrationId(), UUID.randomUUID())).isEmpty();
        var money = jdbc.queryForMap("SELECT total_amount,commission_amount,commission_basis_points,commission_policy FROM payment_checkout_attempts WHERE id=?", snapshot.id());
        assertThat(money.get("total_amount")).isEqualTo(new BigDecimal("20000.00"));
        assertThat(money.get("commission_amount")).isEqualTo(new BigDecimal("600.00"));
        assertThat(money.get("commission_basis_points")).isEqualTo(300);
        assertThat(money.get("commission_policy")).isEqualTo("VINNOT_3_PERCENT_V1");
        var rolledBack = snapshot();
        transaction.executeWithoutResult(status -> { store.prepare(rolledBack); status.setRollbackOnly(); });
        assertThat(store.find(rolledBack.id(), rolledBack.buyerId())).isEmpty();
    }

    @Test
    void storedThreePercentAttemptStillReconcilesAfterTheCurrentPolicyBecomesEightPercent() {
        var historical = store.prepare(snapshot(THREE_PERCENT));
        // The current policy is now 8%: new checkouts are stored with it, next to the old 3% one.
        var current = store.prepare(snapshot(EIGHT_PERCENT));
        var rows = jdbc.queryForList("SELECT commission_amount,commission_basis_points,commission_policy FROM payment_checkout_attempts WHERE id IN (?,?) ORDER BY commission_basis_points",
                historical.id(), current.id());
        assertThat(rows).extracting(row -> row.get("commission_amount")).containsExactly(new BigDecimal("600.00"), new BigDecimal("1600.00"));
        assertThat(rows).extracting(row -> row.get("commission_basis_points")).containsExactly(300, 800);
        assertThat(rows).extracting(row -> row.get("commission_policy")).containsExactly("VINNOT_3_PERCENT_V1", "VINNOT_8_PERCENT_V1");

        var reread = store.find(historical.id(), historical.buyerId()).orElseThrow().snapshot();
        assertThat(reread).isEqualTo(historical);
        assertThat(reread.quote().commissionPolicy()).isEqualTo(THREE_PERCENT);
        assertThat(reread.quote().commission()).isEqualByComparingTo("600");
        assertThat(store.findByRegistration(historical.registrationId(), historical.buyerId()).orElseThrow().hasSameTerms(historical)).isTrue();
        assertThat(store.prepare(historical)).isEqualTo(historical);
        approvedPayment(reread, "600.00").verifyAgainst(reread);
        assertThatThrownBy(() -> approvedPayment(reread, "1600.00").verifyAgainst(reread)).isInstanceOf(IllegalArgumentException.class);

        store.claim(historical.id(), historical.buyerId(), NOW);
        assertThat(store.dispatchedSnapshot(historical.id()).orElseThrow().quote().commission()).isEqualByComparingTo("600");
        var newer = store.find(current.id(), current.buyerId()).orElseThrow().snapshot();
        approvedPayment(newer, "1600.00").verifyAgainst(newer);
    }

    @Test
    void aRetryUnderANewPolicyCannotReplaceTheStoredTerms() {
        var historical = store.prepare(snapshot(THREE_PERCENT));
        var repriced = new CheckoutSnapshot(UUID.randomUUID(), historical.registrationId(), historical.eventId(), historical.buyerId(),
                historical.organizerId(), historical.sellerId(), historical.title(),
                new TicketPaymentQuote(new BigDecimal("10000"), 2, "ARS", EIGHT_PERCENT), historical.expiresAt());
        assertThatThrownBy(() -> store.prepare(repriced)).isInstanceOf(BusinessRuleViolationException.class);
        assertThat(store.find(historical.id(), historical.buyerId()).orElseThrow().snapshot().quote().commissionPolicy()).isEqualTo(THREE_PERCENT);
    }

    @Test
    void databaseRejectsCommissionsThatDoNotFollowTheStoredPolicy() {
        var stored = store.prepare(snapshot(THREE_PERCENT));
        for (String change : new String[]{"commission_amount=601", "commission_basis_points=0", "commission_basis_points=3001",
                "commission_basis_points=800", "commission_policy='VINNOT_3_PERCENT'", "commission_policy='OTHER_3_PERCENT_V1'"}) {
            assertThatThrownBy(() -> jdbc.update("UPDATE payment_checkout_attempts SET " + change + " WHERE id=?", stored.id()))
                    .as(change).isInstanceOf(DataIntegrityViolationException.class);
        }
        assertThat(jdbc.update("UPDATE payment_checkout_attempts SET commission_basis_points=800,commission_amount=1600,commission_policy='VINNOT_8_PERCENT_V1' WHERE id=?",
                stored.id())).isEqualTo(1);
    }

    @Test
    void claimIsOwnerScopedExpiringAndCannotRunInsideATransaction() {
        var snapshot = store.prepare(snapshot());
        assertThat(store.claim(snapshot.id(), UUID.randomUUID(), NOW)).isEmpty();
        assertThat(store.claim(snapshot.id(), snapshot.buyerId(), snapshot.expiresAt())).isEmpty();
        assertThatThrownBy(() -> transaction.execute(status -> store.claim(snapshot.id(), snapshot.buyerId(), NOW)))
                .isInstanceOf(IllegalTransactionStateException.class);
        assertThat(store.claim(snapshot.id(), snapshot.buyerId(), NOW)).contains(snapshot);
        assertThat(store.claim(snapshot.id(), snapshot.buyerId(), NOW)).isEmpty();
        assertThat(store.find(snapshot.id(), snapshot.buyerId()).orElseThrow().status()).isEqualTo(CheckoutAttempt.Status.CREATING);
    }

    @Test
    void uncertainAndCrashedDispatchesAreListedWithoutAutomaticRetryOrStateRegression() {
        var snapshot = store.prepare(snapshot());
        assertThat(store.needingReconciliation(NOW, 200)).doesNotContain(snapshot.id());
        store.claim(snapshot.id(), snapshot.buyerId(), NOW);
        assertThat(store.needingReconciliation(NOW.minusSeconds(1), 200)).doesNotContain(snapshot.id());
        assertThat(store.needingReconciliation(NOW, 200)).contains(snapshot.id());
        store.markUncertain(snapshot.id());
        assertThat(store.claim(snapshot.id(), snapshot.buyerId(), NOW)).isEmpty();
        assertThat(store.complete(ready(snapshot))).isFalse();
        assertThat(store.find(snapshot.id(), snapshot.buyerId()).orElseThrow().status()).isEqualTo(CheckoutAttempt.Status.UNCERTAIN);
        for (int limit : new int[]{0, 201}) assertThatThrownBy(() -> store.needingReconciliation(NOW, limit)).isInstanceOf(IllegalArgumentException.class);
        assertThat(store.needingReconciliation(NOW, 1)).hasSize(1);
        assertThatThrownBy(() -> store.complete(new CheckoutAttempt(snapshot, CheckoutAttempt.Status.PREPARED, null, null)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void readyAcknowledgementIsIdempotentAndCannotBeOverwrittenByLateFailure() {
        var snapshot = store.prepare(snapshot());
        assertThat(store.complete(ready(snapshot))).isFalse();
        store.claim(snapshot.id(), snapshot.buyerId(), NOW);
        assertThat(store.complete(ready(snapshot))).isTrue();
        assertThat(store.complete(ready(snapshot))).isFalse();
        store.markUncertain(snapshot.id());
        assertThat(store.find(snapshot.id(), snapshot.buyerId())).contains(ready(snapshot));
        assertThat(store.needingReconciliation(NOW, 200)).doesNotContain(snapshot.id());
    }

    @Test
    void simultaneousRequestsProduceExactlyOneProviderCallAndReusePersistedLink() throws Exception {
        var snapshot = store.prepare(snapshot());
        var enteredProvider = new CountDownLatch(1);
        var finishProvider = new CountDownLatch(1);
        var calls = new AtomicInteger();
        TicketCheckoutGateway gateway = (request, credentials) -> {
            calls.incrementAndGet();
            // Read through another connection: the claim must already be committed before any external effect.
            assertThat(jdbc.queryForObject("SELECT status FROM payment_checkout_attempts WHERE id=?", String.class, snapshot.id())).isEqualTo("CREATING");
            enteredProvider.countDown();
            try { if (!finishProvider.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("test timeout"); }
            catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); }
            return new TicketCheckoutGateway.Checkout(snapshot.id().toString(), URL);
        };
        var service = new DispatchTicketCheckoutService(store,
                owner -> Optional.of(new SellerCredentials("123", "a", "r", NOW.plusSeconds(3600))), gateway, Clock.fixed(NOW, ZoneOffset.UTC), candidate -> { });
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var first = executor.submit(() -> service.execute(snapshot.id(), snapshot.buyerId()));
            assertThat(enteredProvider.await(10, TimeUnit.SECONDS)).isTrue();
            var second = executor.submit(() -> service.execute(snapshot.id(), snapshot.buyerId()));
            try { assertThat(second.get(10, TimeUnit.SECONDS)).isEmpty(); }
            finally { finishProvider.countDown(); }
            assertThat(first.get(10, TimeUnit.SECONDS)).contains(URL);
        }
        assertThat(service.execute(snapshot.id(), snapshot.buyerId())).contains(URL);
        assertThat(calls.get()).isEqualTo(1);
    }

    @Test
    void simultaneousClaimsHaveExactlyOneWinner() throws Exception {
        var snapshot = store.prepare(snapshot());
        var start = new CountDownLatch(1);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var first = executor.submit(() -> { start.await(); return store.claim(snapshot.id(), snapshot.buyerId(), NOW).isPresent(); });
            var second = executor.submit(() -> { start.await(); return store.claim(snapshot.id(), snapshot.buyerId(), NOW).isPresent(); });
            start.countDown();
            assertThat(first.get(10, TimeUnit.SECONDS) ^ second.get(10, TimeUnit.SECONDS)).isTrue();
        }
    }

    @Test
    void concurrentPreparationReturnsOneCanonicalAttempt() throws Exception {
        var snapshot = snapshot();
        var retry = new CheckoutSnapshot(UUID.randomUUID(), snapshot.registrationId(), snapshot.eventId(), snapshot.buyerId(),
                snapshot.organizerId(), snapshot.sellerId(), snapshot.title(), snapshot.quote(), snapshot.expiresAt());
        var start = new CountDownLatch(1);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var first = executor.submit(() -> { start.await(); return store.prepare(snapshot); });
            var second = executor.submit(() -> { start.await(); return store.prepare(retry); });
            start.countDown();
            assertThat(first.get(10, TimeUnit.SECONDS)).isEqualTo(second.get(10, TimeUnit.SECONDS));
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_checkout_attempts WHERE registration_id=?", Long.class, snapshot.registrationId())).isEqualTo(1L);
    }

    private static String migration(String file) {
        try {
            return new ClassPathResource("db/migration/" + file).getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException unreadable) {
            throw new UncheckedIOException(unreadable);
        }
    }
    private static CheckoutAttempt ready(CheckoutSnapshot snapshot) {
        return new CheckoutAttempt(snapshot, CheckoutAttempt.Status.READY, snapshot.id().toString(), URL);
    }
    private static ProviderPayment approvedPayment(CheckoutSnapshot snapshot, String fee) {
        return new ProviderPayment("1", snapshot.id(), snapshot.sellerId(), true, snapshot.quote().total(), "ARS",
                new BigDecimal(fee), BigDecimal.ZERO, ProviderPayment.Status.APPROVED, NOW, NOW);
    }
    private static CheckoutSnapshot snapshot() {
        return snapshot(THREE_PERCENT);
    }
    private static CheckoutSnapshot snapshot(CommissionPolicy policy) {
        UUID buyer = UUID.randomUUID(), organizer = UUID.randomUUID(), event = UUID.randomUUID(), registration = UUID.randomUUID();
        jdbc.update("INSERT INTO users VALUES (?),(?)", buyer, organizer);
        jdbc.update("INSERT INTO events VALUES (?)", event);
        jdbc.update("INSERT INTO event_registrations VALUES (?)", registration);
        return new CheckoutSnapshot(UUID.randomUUID(), registration, event, buyer, organizer, "123", "Cata",
                new TicketPaymentQuote(new BigDecimal("10000"), 2, "ARS", policy), NOW.plusSeconds(600));
    }
}
