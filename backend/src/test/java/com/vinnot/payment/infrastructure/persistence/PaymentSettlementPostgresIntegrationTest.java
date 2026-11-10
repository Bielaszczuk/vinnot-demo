package com.vinnot.payment.infrastructure.persistence;

import com.vinnot.event.application.command.model.RegisterForEventCommand;
import com.vinnot.event.application.command.model.CancelEventRegistrationCommand;
import com.vinnot.event.application.port.in.RegisterForEventUseCase;
import com.vinnot.event.application.port.in.CancelEventRegistrationUseCase;
import com.vinnot.payment.application.port.out.CheckoutAttemptStore;
import com.vinnot.payment.application.port.out.PaymentLedger;
import com.vinnot.payment.application.port.out.PaymentProviderGateway;
import com.vinnot.payment.application.port.out.PaymentReconciliationQueue;
import com.vinnot.payment.application.port.out.RefundStore;
import com.vinnot.payment.application.port.out.SellerCredentialReader;
import com.vinnot.payment.application.service.ApplyProviderPaymentService;
import com.vinnot.payment.application.service.EventCheckoutReservationService;
import com.vinnot.payment.application.service.ReconcilePaymentsService;
import com.vinnot.payment.application.service.RequestPaymentRefundService;
import com.vinnot.payment.domain.model.CheckoutSnapshot;
import com.vinnot.payment.domain.model.ProviderPayment;
import com.vinnot.payment.domain.model.ReconciliationClaim;
import com.vinnot.payment.domain.model.RefundIntent;
import com.vinnot.payment.domain.model.RefundRejectedException;
import com.vinnot.payment.domain.model.SellerCredentials;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.infrastructure.security.JwtTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import com.vinnot.event.application.port.out.EventNotificationPreferences;
import com.vinnot.event.application.port.out.EventRegistrationNoticeReader;
import com.vinnot.payment.application.port.out.PaymentReceiptAccess;
import com.vinnot.payment.application.service.PaymentExecutionPolicy;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import java.time.Duration;
import java.util.ArrayList;
import org.springframework.http.MediaType;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "ai.provider=mock", "ai.enabled=false", "ai.spending.paid-calls-enabled=false", "app.storage.provider=local", "app.auth.email.provider=log", "app.payments.enabled=true",
        "app.payments.settlement-enabled=true", "app.payments.checkout-enabled=true",
        "app.payments.checkout-return-uri=https://dev.vinnot.com/payments/result",
        "app.payments.notification-uri=https://api-dev.vinnot.com/api/payments/mercadopago/webhooks", "app.payments.client-id=123", "app.payments.client-secret=test-fixture",
        "app.payments.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        "app.payments.redirect-uri=https://dev.vinnot.com/partner/payments/callback",
        "app.effects.poll-ms=3600000", "app.payments.webhook-secret=local-signature-test-fixture-32-characters", "app.payments.initial-delay-ms=3600000"})
@AutoConfigureTestRestTemplate
@Import(PaymentSettlementPostgresIntegrationTest.Configuration.class)
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class PaymentSettlementPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    @Autowired JdbcTemplate jdbc;
    @Autowired EventCheckoutReservationService checkout;
    @Autowired CheckoutAttemptStore attempts;
    @Autowired RegisterForEventUseCase register;
    @Autowired CancelEventRegistrationUseCase cancel;
    @Autowired ApplyProviderPaymentService settlement;
    @Autowired ReconcilePaymentsService reconciliation;
    @Autowired RequestPaymentRefundService requestRefund;
    @Autowired PaymentLedger ledger;
    @Autowired PaymentReconciliationQueue queue;
    @Autowired RefundStore refunds;
    @Autowired FakeProvider provider;
    @Autowired PaymentReceiptAccess receiptAccess;
    @Autowired PlatformTransactionManager transactions;
    @Autowired EventRegistrationNoticeReader notices;
    @Autowired EventNotificationPreferences noticePreferences;
    @Autowired TestRestTemplate http;
    @Autowired JwtTokenService tokens;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> UUID.randomUUID().toString() + UUID.randomUUID());
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Test
    void notificationsAreAtomicVersionedAndSkipObsoleteStates() {
        var r=reservation();
        String filter=" FROM external_effects WHERE kind='EVENT_REGISTRATION_CHANGED' AND payload->>'registrationId'=?";
        assertThat(jdbc.queryForObject("SELECT count(*)"+filter,Long.class,r.registrationId().toString())).isEqualTo(2);
        noticePreferences.setLanguage(r.registrationId(),"en");
        var first=notices.findCurrent(r.registrationId(),1,false).orElseThrow();
        assertThat(first.language()).isEqualTo("en"); assertThat(first.status()).isEqualTo("AWAITING_PAYMENT");
        assertThat(first.recipient()).isEqualTo(r.buyerId()+"@example.com");
        assertThat(notices.findCurrent(r.registrationId(),1,true).orElseThrow().recipient()).isEqualTo(r.organizerId()+"@example.com");
        jdbc.update("UPDATE event_registrations SET status=status WHERE id=?",r.registrationId());
        assertThat(jdbc.queryForObject("SELECT count(*)"+filter,Long.class,r.registrationId().toString())).isEqualTo(2);
        new TransactionTemplate(transactions).executeWithoutResult(tx->{
            jdbc.update("UPDATE event_registrations SET status='CANCELLED' WHERE id=?",r.registrationId());tx.setRollbackOnly();
        });
        assertThat(jdbc.queryForObject("SELECT count(*)"+filter,Long.class,r.registrationId().toString())).isEqualTo(2);
        settlement.apply(r,payment(r,"91001",ProviderPayment.Status.APPROVED,"0"),claim(r));
        assertThat(notices.findCurrent(r.registrationId(),1,false)).isEmpty();
        assertThat(notices.findCurrent(r.registrationId(),2,false).orElseThrow().status()).isEqualTo("CONFIRMED");
        jdbc.update("DELETE FROM external_effects WHERE payload->>'registrationId'=?",r.registrationId().toString());
        jdbc.update("UPDATE event_registrations SET status=status WHERE id=?",r.registrationId());
        assertThat(jdbc.queryForObject("SELECT count(*)"+filter,Long.class,r.registrationId().toString())).isZero();
        jdbc.update("UPDATE event_registrations SET status='CANCELLED',expires_at=NULL WHERE event_id=?",r.eventId());
        assertThat(notices.findCurrent(r.registrationId(),3,false).orElseThrow().status()).isEqualTo("CANCELLED");
        assertThat(jdbc.queryForObject("SELECT count(*)"+filter,Long.class,r.registrationId().toString())).isEqualTo(2);
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class Configuration {
        @Bean @Primary SellerCredentialReader fakeCredentials() {
            return owner -> Optional.of(new SellerCredentials("123", "test-access", "test-refresh", Instant.now().plusSeconds(604800)));
        }
        @Bean @Primary FakeProvider provider() { return new FakeProvider(); }
    }

    @BeforeEach
    void reset() {
        jdbc.execute("TRUNCATE payment_checkout_attempts CASCADE");
        provider.payments.clear();
        provider.calls.set(0);
        provider.loseResponse = false;
        provider.refuse = false;
        provider.rejectWith = null;
        provider.keys.clear();
    }

    @Test
    void reconciliationNeverClaimsOrEnqueuesAnotherEnvironment() {
        var sandbox = reservation();
        var live = reservation();
        jdbc.update("UPDATE payment_checkout_attempts SET environment='LIVE_PILOT' WHERE id=?", live.id());
        queue.notify(live.id());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_reconciliation_jobs WHERE attempt_id=?", Integer.class, live.id())).isZero();
        var liveQueue = new PostgresPaymentReconciliationQueue(jdbc,
                PaymentExecutionPolicy.Environment.LIVE_PILOT);
        liveQueue.notify(sandbox.id());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_reconciliation_jobs WHERE attempt_id=?", Integer.class, sandbox.id())).isZero();
        liveQueue.notify(live.id());
        assertThat(queue.claimDue(Instant.now(), 20)).extracting(ReconciliationClaim::attemptId).containsExactly(sandbox.id());
        var liveClaims = new TransactionTemplate(transactions).execute(status -> liveQueue.claimDue(Instant.now(), 20));
        assertThat(liveClaims).extracting(ReconciliationClaim::attemptId).containsExactly(live.id());
    }

    @Test
    void approvalDuplicatesOutOfOrderUpdatesAndRefundOnlyMoveCapacityOnce() {
        var s = reservation();
        var claim = claim(s);
        var approved = payment(s, "1", ProviderPayment.Status.APPROVED, "0");
        settlement.apply(s, approved, claim);
        settlement.apply(s, approved, claim);
        capacity(s, 2, 0);
        assertThat(notices("PAYMENT_RECEIPT", "1")).as("one receipt for a repeated approval").isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT payload->'data'->>'timeZone' FROM external_effects WHERE kind='NOTIFICATION'"
                + " AND payload->>'type'='PAYMENT_RECEIPT' AND payload->'data'->>'reference'='1'", String.class))
                .isEqualTo(jdbc.queryForObject("SELECT timezone FROM events WHERE id=?", String.class, s.eventId()));
        var older = copy(approved, ProviderPayment.Status.PENDING, "0", approved.updatedAt().minusSeconds(1));
        settlement.apply(s, older, claim);
        assertThat(ledger.find("1").orElseThrow().payment().status()).isEqualTo(ProviderPayment.Status.APPROVED);
        var reversed = copy(approved, ProviderPayment.Status.REFUNDED, "20000", approved.updatedAt().plusSeconds(1));
        settlement.apply(s, reversed, claim);
        settlement.apply(s, reversed, claim);
        capacity(s, 0, 0);
        assertThat(notices("PAYMENT_REFUNDED", "1")).as("buyer and organizer, once").isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT payment_status FROM event_registrations WHERE id=?", String.class, s.registrationId())).isEqualTo("REFUNDED");
        settlement.apply(s, copy(approved, ProviderPayment.Status.APPROVED, "0", reversed.updatedAt().plusSeconds(1)), claim);
        assertThat(ledger.find("1").orElseThrow().payment().status()).isEqualTo(ProviderPayment.Status.REFUNDED);
        assertThat(ledger.creditedPayment(s.id())).contains("1");
    }

    @Test
    void secondPaymentAndLatePaymentProduceDurableSingleRefundWithoutGrantingTickets() {
        var s = reservation();
        var claim = claim(s);
        settlement.apply(s, payment(s, "1", ProviderPayment.Status.APPROVED, "0"), claim);
        settlement.apply(s, payment(s, "2", ProviderPayment.Status.APPROVED, "0"), claim);
        settlement.apply(s, payment(s, "2", ProviderPayment.Status.APPROVED, "0"), claim);
        capacity(s, 2, 0);
        assertThat(refunds.pending(s.id())).hasSize(1);
        assertThat(refunds.pending(s.id()).getFirst().paymentId()).isEqualTo("2");
        var late = reservation();
        cancel.execute(new CancelEventRegistrationCommand(late.eventId(), late.buyerId()));
        settlement.apply(late, payment(late, "3", ProviderPayment.Status.APPROVED, "0"), claim(late));
        capacity(late, 0, 0);
        assertThat(ledger.creditedPayment(late.id())).isEmpty();
        assertThat(refunds.pending(late.id())).hasSize(1);
    }

    @Test
    void expirationAndBlockedAccountPreventAdmissionAndReleaseOnlyTheirHold() {
        var s = reservation();
        jdbc.update("UPDATE event_registrations SET expires_at=now()-interval '1 second' WHERE id=?", s.registrationId());
        settlement.apply(s, payment(s, "4", ProviderPayment.Status.APPROVED, "0"), claim(s));
        capacity(s, 0, 0);
        var blocked = reservation();
        jdbc.update("UPDATE users SET locked=true WHERE id=?", blocked.buyerId());
        settlement.apply(blocked, payment(blocked, "5", ProviderPayment.Status.APPROVED, "0"), claim(blocked));
        capacity(blocked, 0, 0);
        assertThat(refunds.pending(blocked.id())).hasSize(1);
    }

    @Test
    void paymentAfterSnapshotDeadlineIsRefundedEvenIfReservationWasExtended() {
        var s = reservation();
        var paid = payment(s, "6", ProviderPayment.Status.APPROVED, "0");
        var late = new ProviderPayment(paid.id(), s.id(), "123", true, paid.amount(), "ARS", paid.applicationFee(),
                paid.refundedAmount(), paid.status(), paid.updatedAt(), s.expiresAt().plusSeconds(1));
        settlement.apply(s, late, claim(s));
        capacity(s, 0, 0);
        assertThat(refunds.pending(s.id())).hasSize(1);
    }

    @Test
    void concurrentNotificationsClaimOneWorkerAndPreserveNotificationsArrivingDuringWork() throws Exception {
        var s = reservation();
        var start = new CountDownLatch(1);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var a = executor.submit(() -> { start.await(); return queue.claimDue(Instant.now(), 1); });
            var b = executor.submit(() -> { start.await(); return queue.claimDue(Instant.now(), 1); });
            start.countDown();
            var claims = new ArrayList<>(a.get(15, TimeUnit.SECONDS));
            claims.addAll(b.get(15, TimeUnit.SECONDS));
            assertThat(claims).hasSize(1);
            queue.notify(s.id());
            queue.finish(claims.getFirst(), Instant.now().plusSeconds(300), null);
            assertThat(queue.claimDue(Instant.now(), 1)).hasSize(1);
        }
    }

    @Test
    void webhookWokenJobOutranksOverdueScheduledJobs() {
        // claim() leases every due job, so each fixture is claimed before the next one exists.
        var overdue = reservation();
        queue.finish(claim(overdue), Instant.now().plusSeconds(3600), null);
        var woken = reservation();
        queue.finish(claim(woken), Instant.now().plusSeconds(3600), null);
        jdbc.update("UPDATE payment_reconciliation_jobs SET next_check_at=now()-interval '1 hour' WHERE attempt_id=?", overdue.id());
        queue.notify(woken.id());
        assertThat(queue.claimDue(Instant.now(), 1)).extracting(ReconciliationClaim::attemptId).containsExactly(woken.id());
        assertThat(queue.claimDue(Instant.now(), 1)).extracting(ReconciliationClaim::attemptId).containsExactly(overdue.id());
    }

    @Test
    void parkedJobIsNeverPolledUntilANotificationWakesIt() {
        var s = reservation();
        queue.park(claim(s));
        assertThat(queue.claimDue(Instant.now().plus(Duration.ofDays(3650)), 20)).isEmpty();
        queue.notify(s.id());
        assertThat(queue.claimDue(Instant.now(), 20)).extracting(ReconciliationClaim::attemptId).containsExactly(s.id());
    }

    @Test
    void notificationDuringWorkSurvivesParking() {
        var s = reservation();
        var working = claim(s);
        queue.notify(s.id());
        queue.park(working);
        assertThat(queue.claimDue(Instant.now(), 20)).extracting(ReconciliationClaim::attemptId).containsExactly(s.id());
    }

    @Test
    void cancellingAPaidRegistrationOrItsEventWakesTheParkedJob() {
        var registration = reservation();
        var registrationClaim = claim(registration);
        settlement.apply(registration, payment(registration, "93001", ProviderPayment.Status.APPROVED, "0"), registrationClaim);
        queue.park(registrationClaim);
        assertThat(queue.claimDue(Instant.now(), 20)).isEmpty();
        jdbc.update("UPDATE event_registrations SET status='CANCELLED',expires_at=NULL WHERE id=?", registration.registrationId());
        var woken = queue.claimDue(Instant.now(), 20);
        assertThat(woken).extracting(ReconciliationClaim::attemptId).containsExactly(registration.id());

        var event = reservation();
        var eventClaim = claim(event);
        settlement.apply(event, payment(event, "93002", ProviderPayment.Status.APPROVED, "0"), eventClaim);
        queue.park(eventClaim);
        var unpaid = reservation();
        var unpaidClaim = claim(unpaid);
        queue.park(unpaidClaim);
        jdbc.update("UPDATE events SET status='CANCELLED' WHERE id IN (?,?)", event.eventId(), unpaid.eventId());
        assertThat(queue.claimDue(Instant.now(), 20)).extracting(ReconciliationClaim::attemptId).containsExactly(event.id());
    }

    @Test
    void expiredWorkerCannotSettleOrAcknowledgeSuccessOverNewLease() {
        var s = reservation();
        var old = claim(s);
        jdbc.update("UPDATE payment_reconciliation_jobs SET lease_until=now()-interval '1 second' WHERE attempt_id=?", s.id());
        var current = queue.claimDue(Instant.now(), 1).getFirst();
        assertThatThrownBy(() -> settlement.apply(s, payment(s, "7", ProviderPayment.Status.APPROVED, "0"), old)).isInstanceOf(IllegalStateException.class);
        queue.finish(old, Instant.now().plusSeconds(300), null);
        settlement.apply(s, payment(s, "7", ProviderPayment.Status.APPROVED, "0"), current);
        capacity(s, 2, 0);
    }

    @Test
    void financialWriteFailureRollsBackRegistrationAndCapacity() {
        var s = reservation();
        var claim = claim(s);
        jdbc.execute("ALTER TABLE payment_observations ADD CONSTRAINT fixture_failure CHECK(payment_id<>'8')");
        try {
            assertThatThrownBy(() -> settlement.apply(s, payment(s, "8", ProviderPayment.Status.APPROVED, "0"), claim)).isInstanceOf(RuntimeException.class);
            capacity(s, 0, 2);
            assertThat(ledger.find("8")).isEmpty();
        } finally { jdbc.execute("ALTER TABLE payment_observations DROP CONSTRAINT fixture_failure"); }
    }

    @Test
    void cancelledEventAndVoluntaryFullRefundUseSameDurableWorkflow() {
        var s = reservation();
        var claim = claim(s);
        var paid = payment(s, "9", ProviderPayment.Status.APPROVED, "0");
        settlement.apply(s, paid, claim);
        jdbc.update("UPDATE events SET status='CANCELLED' WHERE id=?", s.eventId());
        settlement.apply(s, paid, claim);
        capacity(s, 0, 0);
        assertThat(refunds.pending(s.id())).hasSize(1);
        assertThat(notices("PAYMENT_REFUND_REQUESTED", "9")).as("automatic refund of a cancelled event").isEqualTo(2);
        var other = reservation();
        settlement.apply(other, payment(other, "10", ProviderPayment.Status.APPROVED, "0"), claim(other));
        assertThatThrownBy(() -> requestRefund.request(other.id(), s.organizerId())).isInstanceOf(DomainException.class);
        requestRefund.request(other.id(), other.organizerId());
        UUID key = refunds.pending(other.id()).getFirst().id();
        requestRefund.request(other.id(), other.organizerId());
        assertThat(refunds.pending(other.id()).getFirst().id()).isEqualTo(key);
        assertThat(notices("PAYMENT_REFUND_REQUESTED", "10")).as("a repeated request sends nothing new").isEqualTo(2);
        capacity(other, 0, 0);
    }

    @Test
    void partialRefundAndChargebackInvalidateTicketsWithoutAutomaticallyRepeatingRefund() {
        var s = reservation();
        var claim = claim(s);
        var paid = payment(s, "11", ProviderPayment.Status.APPROVED, "0");
        settlement.apply(s, paid, claim);
        requestRefund.request(s.id(), s.organizerId());
        settlement.apply(s, copy(paid, ProviderPayment.Status.APPROVED, "5000", paid.updatedAt().plusSeconds(1)), claim);
        capacity(s, 0, 0);
        assertThat(ledger.find("11").orElseThrow().review()).isTrue();
        assertThat(refunds.pending(s.id())).isEmpty();
        var other = reservation();
        var chargeback = payment(other, "12", ProviderPayment.Status.CHARGED_BACK, "0");
        var otherClaim = claim(other);
        settlement.apply(other, chargeback, otherClaim);
        settlement.apply(other, chargeback, otherClaim);
        capacity(other, 0, 0);
        assertThat(notices("PAYMENT_CHARGEBACK", "12")).isEqualTo(1);
        assertThat(notices("PAYMENT_REFUNDED", "11")).as("partial refund announces its amount").isEqualTo(2);
    }

    @Test
    void workerFindsMissedWebhookAndVerifiesRefundAfterLostResponseWithoutSecondPost() {
        var s = reservation();
        provider.payments.put("13", payment(s, "13", ProviderPayment.Status.APPROVED, "0"));
        reconciliation.execute(1);
        capacity(s, 2, 0);
        assertThatThrownBy(() -> cancel.execute(new CancelEventRegistrationCommand(s.eventId(), s.buyerId())))
                .hasMessageContaining("Contact the organizer");
        capacity(s, 2, 0);
        requestRefund.request(s.id(), s.organizerId());
        queue.notify(s.id());
        provider.loseResponse = true;
        reconciliation.execute(1);
        assertThat(provider.calls.get()).isEqualTo(1);
        assertThat(refunds.pending(s.id()).getFirst().status()).isEqualTo(RefundIntent.Status.UNCERTAIN);
        queue.notify(s.id());
        reconciliation.execute(1);
        assertThat(provider.calls.get()).isEqualTo(1);
        assertThat(refunds.pending(s.id())).isEmpty();
        assertThat(jdbc.queryForObject("SELECT status FROM payment_refund_intents WHERE payment_id='13'", String.class)).isEqualTo("SUCCEEDED");
        capacity(s, 0, 0);
    }

    @Test
    void refundFailureRemainsVisibleAndReconciliationDoesNotRetryMoneyMovementBlindly() {
        var s = reservation();
        cancel.execute(new CancelEventRegistrationCommand(s.eventId(), s.buyerId()));
        provider.payments.put("14", payment(s, "14", ProviderPayment.Status.APPROVED, "0"));
        provider.refuse = true;
        reconciliation.execute(1);
        assertThat(refunds.pending(s.id()).getFirst().status()).isEqualTo(RefundIntent.Status.UNCERTAIN);
        queue.notify(s.id());
        reconciliation.execute(1);
        assertThat(provider.calls.get()).isEqualTo(1);
        assertThat(notices("PAYMENT_REFUND_REJECTED", "14")).as("an uncertain outcome is not a rejection").isZero();
        capacity(s, 0, 0);
    }

    @Test
    void anOrganizerRequestNeverResendsAnUncertainRefund() {
        var s = reservation();
        provider.payments.put("23", payment(s, "23", ProviderPayment.Status.APPROVED, "0"));
        reconciliation.execute(1);
        provider.refuse = true;
        requestRefund.request(s.id(), s.organizerId());
        reconciliation.execute(1);
        assertThat(refundStatus("23")).isEqualTo("UNCERTAIN");
        requestRefund.request(s.id(), s.organizerId());
        reconciliation.execute(1);
        assertThat(provider.calls.get()).isEqualTo(1);
        assertThat(refundStatus("23")).isEqualTo("UNCERTAIN");
    }

    @Test
    void aRejectedRefundIsReportedNeverResentAloneAndRetriesWithAKeyOfItsOwnWhenTheOrganizerAsks() {
        var s = reservation();
        provider.payments.put("21", payment(s, "21", ProviderPayment.Status.APPROVED, "0"));
        reconciliation.execute(1);
        capacity(s, 2, 0);
        jdbc.update("UPDATE events SET status='CANCELLED' WHERE id=?", s.eventId());
        provider.rejectWith = new RefundRejectedException("HTTP_428:insufficient_money_for_refund");
        reconciliation.execute(1);
        assertThat(notices("PAYMENT_REFUND_REQUESTED", "21")).as("the automatic refund of the cancelled event").isEqualTo(2);
        assertThat(refundStatus("21")).isEqualTo("REJECTED");
        assertThat(jdbc.queryForObject("SELECT rejection_reason FROM payment_refund_intents WHERE payment_id='21'", String.class))
                .isEqualTo("HTTP_428:insufficient_money_for_refund");
        assertThat(refunds.pending(s.id())).isEmpty();
        assertThat(notices("PAYMENT_REFUND_REJECTED", "21")).as("the organizer is told once").isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT payload->'recipient'->>'userId' FROM external_effects WHERE kind='NOTIFICATION'"
                + " AND payload->>'type'='PAYMENT_REFUND_REJECTED' AND payload->'data'->>'reference'='21'", String.class))
                .isEqualTo(s.organizerId().toString());
        queue.notify(s.id());
        reconciliation.execute(1);
        assertThat(provider.calls.get()).as("a rejected refund is never sent again on its own").isEqualTo(1);
        var reader = new PostgresOrganizerPaymentReader(jdbc, PaymentExecutionPolicy.Environment.SANDBOX);
        var shown = reader.find(s.eventId(), List.of(s.registrationId())).getFirst();
        assertThat(shown.refundStatus()).isEqualTo(RefundIntent.Status.REJECTED);
        assertThat(shown.canRefund()).isTrue();

        requestRefund.request(s.id(), s.organizerId());
        assertThat(refundStatus("21")).isEqualTo("PREPARED");
        requestRefund.request(s.id(), s.organizerId());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_refund_intents WHERE payment_id='21'", Integer.class)).isEqualTo(1);
        reconciliation.execute(1);
        assertThat(provider.calls.get()).isEqualTo(2);
        assertThat(refundStatus("21")).isEqualTo("REJECTED");
        assertThat(notices("PAYMENT_REFUND_REJECTED", "21")).as("each rejection is reported").isEqualTo(2);

        provider.rejectWith = null;
        requestRefund.request(s.id(), s.organizerId());
        reconciliation.execute(1);
        assertThat(provider.calls.get()).isEqualTo(3);
        String first = provider.keys.getFirst();
        assertThat(provider.keys).as("a rejected key is never reused: it could replay the cached rejection")
                .containsExactly(first, first + "-retry-1", first + "-retry-2");
        assertThat(refundStatus("21")).isEqualTo("SUCCEEDED");
        requestRefund.request(s.id(), s.organizerId());
        reconciliation.execute(1);
        assertThat(provider.calls.get()).as("a completed refund is never re-armed").isEqualTo(3);
        capacity(s, 0, 0);
    }

    @Test
    void concurrentRetriesReArmARejectedRefundOnce() throws Exception {
        var s = reservation();
        provider.payments.put("22", payment(s, "22", ProviderPayment.Status.APPROVED, "0"));
        reconciliation.execute(1);
        provider.rejectWith = new RefundRejectedException("HTTP_400:2063");
        requestRefund.request(s.id(), s.organizerId());
        reconciliation.execute(1);
        assertThat(refundStatus("22")).isEqualTo("REJECTED");
        provider.rejectWith = null;
        var start = new CountDownLatch(1);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var first = executor.submit(() -> { start.await(); requestRefund.request(s.id(), s.organizerId()); return true; });
            var second = executor.submit(() -> { start.await(); requestRefund.request(s.id(), s.organizerId()); return true; });
            start.countDown();
            assertThat(first.get(15, TimeUnit.SECONDS)).isTrue();
            assertThat(second.get(15, TimeUnit.SECONDS)).isTrue();
        }
        assertThat(refundStatus("22")).isEqualTo("PREPARED");
        reconciliation.execute(1);
        queue.notify(s.id());
        reconciliation.execute(1);
        assertThat(provider.calls.get()).isEqualTo(2);
        assertThat(refundStatus("22")).isEqualTo("SUCCEEDED");
    }

    @Test
    void webhookRequiresSignatureRejectsAmbiguousHeadersAndNeverTrustsBody() throws Exception {
        var s = reservation();
        String url = "/payments/mercadopago/webhooks/" + s.id() + "?data.id=123";
        var headers = new HttpHeaders();
        assertThat(http.postForEntity(url, new HttpEntity<>("{}", headers), String.class).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        String ts = Long.toString(Instant.now().getEpochSecond());
        headers.set("x-request-id", "request-test");
        headers.set("x-signature", signed(ts));
        headers.setContentType(MediaType.APPLICATION_JSON);
        assertThat(http.postForEntity(url, new HttpEntity<>("{\"status\":\"approved\",\"live_mode\":true}", headers), String.class).getStatusCode()).isEqualTo(HttpStatus.OK);
        capacity(s, 0, 2);
        assertThat(ledger.knownPayments(s.id())).isEmpty();
        assertThat(http.postForEntity(url + "&data.id=456", new HttpEntity<>("{}", headers), String.class).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        headers.add("x-signature", signed(ts));
        assertThat(http.postForEntity(url, new HttpEntity<>("{}", headers), String.class).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(http.getForEntity(url, String.class).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void applicationWebhookOnlyWakesKnownPaymentsInItsEnvironment() throws Exception {
        var s = reservation();
        String url = "/payments/mercadopago/webhooks?data.id=123";
        var headers = new HttpHeaders();
        assertThat(http.postForEntity(url, new HttpEntity<>("{}", headers), String.class).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        headers.set("x-request-id", "request-test");
        headers.set("x-signature", signed(Long.toString(Instant.now().getEpochSecond())));
        assertThat(http.postForEntity(url, new HttpEntity<>("{}", headers), String.class).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_reconciliation_jobs", Integer.class)).isZero();
        settlement.apply(s, payment(s, "123", ProviderPayment.Status.APPROVED, "0"), claim(s));
        long before = jdbc.queryForObject("SELECT revision FROM payment_reconciliation_jobs WHERE attempt_id=?", Long.class, s.id());
        assertThat(http.postForEntity(url, new HttpEntity<>("{\"status\":\"refunded\"}", headers), String.class).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(jdbc.queryForObject("SELECT revision FROM payment_reconciliation_jobs WHERE attempt_id=?", Long.class, s.id())).isEqualTo(before + 1);
        capacity(s, 2, 0);
        jdbc.update("UPDATE payment_checkout_attempts SET environment='LIVE_PILOT' WHERE id=?", s.id());
        assertThat(http.postForEntity(url, new HttpEntity<>("{}", headers), String.class).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(jdbc.queryForObject("SELECT revision FROM payment_reconciliation_jobs WHERE attempt_id=?", Long.class, s.id())).isEqualTo(before + 1);
        assertThat(http.postForEntity(url + "&data.id=456", new HttpEntity<>("{}", headers), String.class).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void refundHttpRequiresAuthenticatedCurrentOwnerAndAcceptsRequestWithoutClaimingMoneyWasReturned() {
        var s = reservation();
        settlement.apply(s, payment(s, "15", ProviderPayment.Status.APPROVED, "0"), claim(s));
        String url = "/payments/checkouts/" + s.id() + "/refund";
        assertThat(http.postForEntity(url, null, String.class).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        var headers = new HttpHeaders();
        headers.setBearerAuth(tokens.generateAccessToken(s.organizerId(), "organizer@example.com", List.of("ROLE_PARTNER"), List.of()));
        assertThat(http.exchange(url, HttpMethod.POST, new HttpEntity<>(null, headers), String.class).getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
        capacity(s, 0, 0);
        assertThat(jdbc.queryForObject("SELECT payment_status FROM event_registrations WHERE id=?", String.class, s.registrationId())).isEqualTo("APPROVED");
        jdbc.update("UPDATE users SET locked=true WHERE id=?", s.organizerId());
        assertThat(http.exchange(url, HttpMethod.POST, new HttpEntity<>(null, headers), String.class).getStatusCode().is4xxClientError()).isTrue();
    }

    @Test
    void storesEnforceTransactionsAndSingleRefundClaim() {
        var s = reservation();
        settlement.apply(s, payment(s, "16", ProviderPayment.Status.APPROVED, "0"), claim(s));
        assertThatThrownBy(() -> refunds.requireRefund(s.id(), "16", new BigDecimal("20000"))).isInstanceOf(RuntimeException.class);
        requestRefund.request(s.id(), s.organizerId());
        var intent = refunds.pending(s.id()).getFirst();
        var tx = new TransactionTemplate(transactions);
        assertThatThrownBy(() -> tx.execute(status -> refunds.claim(intent.id()))).isInstanceOf(RuntimeException.class);
        assertThat(refunds.claim(intent.id())).isPresent();
        assertThat(refunds.claim(intent.id())).isEmpty();
        assertThatThrownBy(() -> queue.claimDue(Instant.now(), 0)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void successfulRefundSettlesAndNeverRepostsAfterRestart() {
        var s = reservation();
        provider.payments.put("17", payment(s, "17", ProviderPayment.Status.APPROVED, "0"));
        reconciliation.execute(1);
        requestRefund.request(s.id(), s.organizerId());
        reconciliation.execute(1);
        assertThat(provider.calls.get()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT status FROM payment_refund_intents WHERE payment_id='17'", String.class)).isEqualTo("SUCCEEDED");
        requestRefund.request(s.id(), s.organizerId());
        queue.notify(s.id());
        reconciliation.execute(1);
        assertThat(provider.calls.get()).isEqualTo(1);
        capacity(s, 0, 0);
    }

    @Test
    void cancellationRacingWithApprovalCannotLeaveTicketsOrDoubleReleaseCapacity() throws Exception {
        var s = reservation();
        var claim = claim(s);
        var paid = payment(s, "18", ProviderPayment.Status.APPROVED, "0");
        var start = new CountDownLatch(1);
        boolean cancelled;
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var approval = executor.submit(() -> { start.await(); settlement.apply(s, paid, claim); return true; });
            // Approval first confirms a paid ticket the attendee can no longer cancel alone.
            var cancellation = executor.submit(() -> {
                start.await();
                try {
                    cancel.execute(new CancelEventRegistrationCommand(s.eventId(), s.buyerId()));
                    return true;
                } catch (BusinessRuleViolationException exception) {
                    assertThat(exception.getCode()).isEqualTo("PAID_REGISTRATION_REQUIRES_ORGANIZER");
                    return false;
                }
            });
            start.countDown();
            assertThat(approval.get(15, TimeUnit.SECONDS)).isTrue();
            cancelled = cancellation.get(15, TimeUnit.SECONDS);
        }
        settlement.apply(s, paid, claim);
        if (!cancelled) {
            capacity(s, 2, 0);
            assertThat(refunds.pending(s.id())).isEmpty();
            requestRefund.request(s.id(), s.organizerId());
            settlement.apply(s, copy(paid, ProviderPayment.Status.REFUNDED, paid.amount().toPlainString(), paid.updatedAt().plusSeconds(1)), claim);
        } else {
            assertThat(refunds.pending(s.id())).hasSize(1);
        }
        capacity(s, 0, 0);
        var next = register.execute(new RegisterForEventCommand(s.eventId(), s.buyerId(), 2, null, null, null, null, List.of(), null, false));
        assertThat(next.id()).isNotEqualTo(s.registrationId());
        capacity(s, 0, 2);
        settlement.apply(s, paid, claim);
        capacity(s, 0, 2);
    }

    @Test
    void settlementRejectsCrossRegistrationContextAndPaymentIdentityReuse() {
        var a = reservation();
        var claimA = claim(a);
        settlement.apply(a, payment(a, "19", ProviderPayment.Status.APPROVED, "0"), claimA);
        var b = reservation();
        var claimB = claim(b);
        assertThatThrownBy(() -> settlement.apply(b, payment(b, "19", ProviderPayment.Status.APPROVED, "0"), claimB))
                .isInstanceOf(IllegalArgumentException.class);
        var mismatched = new CheckoutSnapshot(b.id(), b.registrationId(), b.eventId(), a.buyerId(), b.organizerId(),
                b.sellerId(), b.title(), b.quote(), b.expiresAt());
        assertThatThrownBy(() -> settlement.apply(mismatched, payment(b, "20", ProviderPayment.Status.APPROVED, "0"), claimB))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> settlement.apply(b, payment(b, "20", ProviderPayment.Status.APPROVED, "0"), claimA))
                .isInstanceOf(IllegalArgumentException.class);
        capacity(a, 2, 0);
        capacity(b, 0, 2);
        assertThat(ledger.find("20")).isEmpty();
    }

    @Test
    void organizerProjectionIsBoundedScopedAndTracksActualRefundLifecycle() {
        var a=reservation(); var b=reservation();
        var reader=new PostgresOrganizerPaymentReader(jdbc,PaymentExecutionPolicy.Environment.SANDBOX);
        assertThat(reader.find(a.eventId(),List.of())).isEmpty();
        assertThat(reader.find(a.eventId(),List.of(a.registrationId(),b.registrationId()))).hasSize(1).allMatch(p->!p.canRefund());
        var claim=claim(a); var paid=payment(a,"77",ProviderPayment.Status.APPROVED,"0");
        settlement.apply(a,paid,claim);
        assertThat(reader.find(a.eventId(),List.of(a.registrationId())).getFirst().canRefund()).isTrue();
        provider.payments.put(paid.id(),paid);
        requestRefund.request(a.id(),a.organizerId());
        var pending=reader.find(a.eventId(),List.of(a.registrationId())).getFirst();
        assertThat(pending.refundStatus()).isEqualTo(RefundIntent.Status.PREPARED);assertThat(pending.canRefund()).isFalse();
        settlement.apply(a,copy(paid,ProviderPayment.Status.REFUNDED,"20000",paid.updatedAt().plusSeconds(1)),claim);
        assertThat(reader.find(a.eventId(),List.of(a.registrationId())).getFirst().refundStatus()).isEqualTo(RefundIntent.Status.SUCCEEDED);
        jdbc.update("UPDATE payment_checkout_attempts SET environment='LIVE_PILOT' WHERE id=?",a.id());
        assertThat(reader.find(a.eventId(),List.of(a.registrationId()))).isEmpty();
    }

    @Test
    void organizerPaymentHttpEnforcesOwnershipAndReturnsActionWithoutLeakingCredentials() {
        var s = reservation();
        String url = "/payments/events/" + s.eventId() + "/registrations?registrationIds=" + s.registrationId();
        assertThat(http.getForEntity(url,String.class).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        var headers = new HttpHeaders();
        headers.setBearerAuth(tokens.generateAccessToken(s.organizerId(),"organizer@example.com",List.of("ROLE_PARTNER"),List.of()));
        var pending = http.exchange(url,HttpMethod.GET,new HttpEntity<>(null,headers),String.class);
        assertThat(pending.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(pending.getBody()).contains("\"canRefund\":false","\"paymentStatus\":\"PENDING\"").doesNotContain("sellerId","token","payment_id");
        settlement.apply(s,payment(s,"78",ProviderPayment.Status.APPROVED,"0"),claim(s));
        assertThat(http.exchange(url,HttpMethod.GET,new HttpEntity<>(null,headers),String.class).getBody()).contains("\"canRefund\":true");
        var other = reservation();
        assertThat(http.exchange("/payments/events/"+other.eventId()+"/registrations?registrationIds="+other.registrationId(),HttpMethod.GET,
                new HttpEntity<>(null,headers),String.class).getStatusCode().is4xxClientError()).isTrue();
        jdbc.update("UPDATE payment_observations SET needs_review=true WHERE attempt_id=?",s.id());
        assertThat(http.exchange(url,HttpMethod.GET,new HttpEntity<>(null,headers),String.class).getBody()).contains("\"canRefund\":false");
        assertThatThrownBy(()->requestRefund.request(s.id(),s.organizerId())).isInstanceOf(DomainException.class);
        jdbc.update("UPDATE payment_observations SET needs_review=false WHERE attempt_id=?",s.id());
        jdbc.update("UPDATE events SET organizer_id=? WHERE id=?",other.organizerId(),s.eventId());
        assertThatThrownBy(()->requestRefund.request(s.id(),s.organizerId())).isInstanceOf(DomainException.class);
    }

    @Test
    void privateTicketsAreOwnerScopedAndPublicReceiptOnlyExposesVerifiedOutcome() {
        var own = reservation(); var other = reservation();
        jdbc.update("INSERT INTO user_roles(user_id,role_id) SELECT ?,id FROM roles WHERE name='ROLE_USER'",own.buyerId());
        var headers = new HttpHeaders();
        headers.setBearerAuth(tokens.generateAccessToken(own.buyerId(),own.buyerId()+"@example.com",List.of("ROLE_USER"),List.of()));
        assertThat(http.getForEntity("/me/tickets",String.class).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        var page = http.exchange("/me/tickets",HttpMethod.GET,new HttpEntity<>(null,headers),String.class);
        assertThat(page.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(page.getHeaders().getCacheControl()).contains("no-store");
        assertThat(page.getBody()).contains("\"pageNumber\":0", "\"totalItems\":1", "\"totalPages\":1");
        assertThat(page.getBody()).contains(own.registrationId().toString()).doesNotContain(other.registrationId().toString());
        assertThat(http.exchange("/me/tickets/"+other.registrationId(),HttpMethod.GET,new HttpEntity<>(null,headers),String.class).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(http.exchange("/me/tickets/"+own.registrationId(),HttpMethod.GET,new HttpEntity<>(null,headers),String.class).getBody()).contains("Paid tasting");
        assertThat(http.exchange("/me/tickets?size=51",HttpMethod.GET,new HttpEntity<>(null,headers),String.class).getStatusCode().is4xxClientError()).isTrue();
        String url = "/payments/receipt?token="+receiptAccess.issue(own.id());
        assertThat(http.getForEntity(url+"&status=approved",String.class).getBody()).isEqualTo("{\"status\":\"PENDING\"}");
        assertThat(http.getForEntity("/payments/receipt?token="+own.id(),String.class).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        var claim = claim(own);
        var approved = payment(own,"901",ProviderPayment.Status.APPROVED,"0");
        settlement.apply(own,approved,claim);
        assertThat(http.getForEntity(url,String.class).getBody()).isEqualTo("{\"status\":\"CONFIRMED\"}");
        settlement.apply(own,copy(approved,ProviderPayment.Status.REFUNDED,"20000",approved.updatedAt().plusSeconds(1)),claim);
        assertThat(http.getForEntity(url,String.class).getBody()).isEqualTo("{\"status\":\"REFUNDED\"}");
        jdbc.update("UPDATE payment_checkout_attempts SET environment='LIVE_PILOT' WHERE id=?",own.id());
        assertThat(http.getForEntity(url,String.class).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void theAccountLinksOfACheckoutAreClearedOnDeletionInsteadOfBlockingIt() {
        var rules = jdbc.queryForList("""
                SELECT a.attname AS name, c.conname AS constraint_name, c.confdeltype AS rule, a.attnotnull AS required
                FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
                WHERE c.conrelid='payment_checkout_attempts'::regclass AND c.contype='f'
                AND a.attname IN ('buyer_id','organizer_id','registration_id','event_id') ORDER BY a.attname
                """);
        assertThat(rules).extracting(row -> row.get("constraint_name")).containsExactly(
                "payment_checkout_attempts_buyer_id_fkey", "payment_checkout_attempts_event_id_fkey",
                "payment_checkout_attempts_organizer_id_fkey", "payment_checkout_attempts_registration_id_fkey");
        assertThat(rules).allSatisfy(row -> {
            assertThat(row.get("rule")).as("ON DELETE SET NULL").hasToString("n");
            assertThat(row.get("required")).isEqualTo(false);
        });
    }

    @Test
    void deletingTheBuyerKeepsThePaymentHistoryAndOnlyClearsTheLinks() {
        var s = reservation();
        var claim = claim(s);
        var approved = payment(s, "94001", ProviderPayment.Status.APPROVED, "0");
        settlement.apply(s, approved, claim);

        assertThat(jdbc.update("DELETE FROM users WHERE id=?", s.buyerId())).isEqualTo(1);

        var row = jdbc.queryForMap("SELECT buyer_id,registration_id,organizer_id,event_id,total_amount FROM payment_checkout_attempts WHERE id=?", s.id());
        assertThat(row.get("buyer_id")).isNull();
        assertThat(row.get("registration_id")).isNull();
        assertThat(row.get("organizer_id")).isEqualTo(s.organizerId());
        assertThat(row.get("event_id")).isEqualTo(s.eventId());
        assertThat(row.get("total_amount")).isEqualTo(new BigDecimal("20000.00"));
        assertThat(ledger.creditedPayment(s.id())).contains("94001");
        var unlinked = attempts.dispatchedSnapshot(s.id()).orElseThrow();
        assertThat(unlinked.linked()).isFalse();
        assertThat(unlinked.organizerId()).isEqualTo(s.organizerId());

        // A refund made from the Mercado Pago panel is still recorded; only the organizer, who still exists, is told.
        settlement.apply(unlinked, copy(approved, ProviderPayment.Status.REFUNDED, "20000", approved.updatedAt().plusSeconds(1)), claim);
        assertThat(ledger.find("94001").orElseThrow().payment().status()).isEqualTo(ProviderPayment.Status.REFUNDED);
        assertThat(ledger.creditedPayment(s.id())).contains("94001");
        assertThat(notices("PAYMENT_REFUNDED", "94001")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT payload->'recipient'->>'userId' FROM external_effects WHERE kind='NOTIFICATION'"
                + " AND payload->>'type'='PAYMENT_REFUNDED' AND payload->'data'->>'reference'='94001'", String.class))
                .isEqualTo(s.organizerId().toString());
        // A refund request needs the buyer's registration, which no longer exists.
        assertThatThrownBy(() -> requestRefund.request(s.id(), s.organizerId()))
                .isInstanceOf(BusinessRuleViolationException.class).hasMessageContaining("devolución");
    }

    @Test
    void aPaymentApprovedAfterTheBuyerDeletedTheAccountIsRefundedWithoutATicket() {
        var s = reservation();
        assertThat(jdbc.update("DELETE FROM users WHERE id=?", s.buyerId())).isEqualTo(1);
        provider.payments.put("94002", payment(s, "94002", ProviderPayment.Status.APPROVED, "0"));
        queue.notify(s.id());

        reconciliation.execute(1);

        assertThat(provider.calls.get()).isEqualTo(1);
        assertThat(refundStatus("94002")).isEqualTo("SUCCEEDED");
        assertThat(ledger.creditedPayment(s.id())).isEmpty();
        assertThat(ledger.find("94002").orElseThrow().payment().status()).isEqualTo(ProviderPayment.Status.REFUNDED);
        assertThat(notices("PAYMENT_REFUND_REQUESTED", "94002")).as("organizer only").isEqualTo(1);
        assertThat(notices("PAYMENT_RECEIPT", "94002")).isZero();
    }

    @Test
    void deletingTheOrganizerKeepsThePaymentHistoryAndParksItsReconciliation() {
        var s = reservation();
        var claim = claim(s);
        settlement.apply(s, payment(s, "94003", ProviderPayment.Status.APPROVED, "0"), claim);
        queue.park(claim);
        jdbc.update("INSERT INTO payment_accounts(owner_id,provider,environment) VALUES (?,'MERCADO_PAGO','SANDBOX')", s.organizerId());

        assertThat(jdbc.update("DELETE FROM users WHERE id=?", s.organizerId())).isEqualTo(1);

        var row = jdbc.queryForMap("SELECT buyer_id,registration_id,organizer_id,event_id FROM payment_checkout_attempts WHERE id=?", s.id());
        assertThat(row.get("organizer_id")).isNull();
        assertThat(row.get("event_id")).isNull();
        assertThat(row.get("registration_id")).isNull();
        assertThat(row.get("buyer_id")).isEqualTo(s.buyerId());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_accounts WHERE owner_id=?", Integer.class, s.organizerId()))
                .as("the payment connection goes with the account").isZero();
        assertThat(ledger.creditedPayment(s.id())).contains("94003");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_reconciliation_jobs WHERE attempt_id=?", Integer.class, s.id())).isEqualTo(1);

        // Without the organizer's connection nothing can be read or refunded: the job is parked instead of retried forever.
        provider.payments.put("94003", copy(payment(s, "94003", ProviderPayment.Status.APPROVED, "0"),
                ProviderPayment.Status.REFUNDED, "20000", Instant.now()));
        queue.notify(s.id());
        reconciliation.execute(1);
        assertThat(queue.claimDue(Instant.now().plus(Duration.ofDays(3650)), 20)).isEmpty();
        assertThat(jdbc.queryForObject("SELECT last_failure FROM payment_reconciliation_jobs WHERE attempt_id=?", String.class, s.id())).isNull();
        assertThat(ledger.find("94003").orElseThrow().payment().status()).isEqualTo(ProviderPayment.Status.APPROVED);
        assertThat(provider.calls.get()).isZero();
    }

    private ReconciliationClaim claim(CheckoutSnapshot s) {
        queue.notify(s.id());
        return queue.claimDue(Instant.now(), 20).stream().filter(c -> c.attemptId().equals(s.id())).findFirst().orElseThrow();
    }
    private CheckoutSnapshot reservation() {
        UUID organizer = user(), buyer = user(), event = UUID.randomUUID();
        jdbc.update("INSERT INTO user_roles(user_id,role_id) SELECT ?,id FROM roles WHERE name='ROLE_PARTNER'", organizer);
        jdbc.update("""
                INSERT INTO events(id,title,event_type,start_date,end_date,organizer_id,status,published_once,
                    price,max_attendees,max_tickets_per_registration,approval_mode,attendee_confirmation_required)
                VALUES (?,'Paid tasting','TASTING',now()+interval '2 days',now()+interval '3 days',?,'PUBLISHED',true,10000,2,4,'AUTOMATIC',false)
                """, event, organizer);
        var r = register.execute(new RegisterForEventCommand(event, buyer, 2, null, null, null, null, List.of(), null, false));
        UUID attempt = checkout.prepare(event, r.id(), buyer);
        return attempts.claim(attempt, buyer, Instant.now()).orElseThrow();
    }
    private UUID user() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name,active,email_verified) VALUES (?,?,?,?,'Test','User',true,true)", id, "user-" + id, id + "@example.com", "test-hash");
        return id;
    }
    private void capacity(CheckoutSnapshot s, int current, int held) {
        assertThat(jdbc.queryForObject("SELECT current_attendees FROM events WHERE id=?", Integer.class, s.eventId())).isEqualTo(current);
        assertThat(jdbc.queryForObject("SELECT held_attendees FROM events WHERE id=?", Integer.class, s.eventId())).isEqualTo(held);
    }
    private static ProviderPayment payment(CheckoutSnapshot s, String id, ProviderPayment.Status status, String refunded) {
        Instant now = Instant.now().minusSeconds(1).truncatedTo(ChronoUnit.MICROS);
        return new ProviderPayment(id, s.id(), s.sellerId(), true, s.quote().total(), "ARS", s.quote().commission(), new BigDecimal(refunded), status, now, now);
    }
    private static ProviderPayment copy(ProviderPayment p, ProviderPayment.Status status, String refunded, Instant updated) {
        return new ProviderPayment(p.id(), p.attemptId(), p.sellerId(), p.accountEnvironmentVerified(), p.amount(), p.currency(), p.applicationFee(), new BigDecimal(refunded), status, updated, p.approvedAt());
    }
    private static String signed(String timestamp) throws Exception {
        var mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("local-signature-test-fixture-32-characters".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return "ts=" + timestamp + ",v1=" + HexFormat.of().formatHex(mac.doFinal(("id:123;request-id:request-test;ts:" + timestamp + ";").getBytes(StandardCharsets.UTF_8)));
    }
    static class FakeProvider implements PaymentProviderGateway {
        final Map<String, ProviderPayment> payments = new ConcurrentHashMap<>();
        final AtomicInteger calls = new AtomicInteger();
        final List<String> keys = new CopyOnWriteArrayList<>();
        boolean loseResponse;
        boolean refuse;
        RefundRejectedException rejectWith;
        public List<String> search(UUID id, SellerCredentials seller) { return payments.values().stream().filter(p -> p.attemptId().equals(id)).map(ProviderPayment::id).sorted().toList(); }
        public ProviderPayment read(String id, SellerCredentials seller) { return Optional.ofNullable(payments.get(id)).orElseThrow(); }
        public void refund(RefundIntent intent, SellerCredentials seller) {
            calls.incrementAndGet();
            keys.add(intent.idempotencyKey());
            if (rejectWith != null) { throw rejectWith; }
            if (refuse) { throw new IllegalStateException("Simulated provider unavailable"); }
            var p = payments.get(intent.paymentId());
            payments.put(p.id(), copy(p, ProviderPayment.Status.REFUNDED, p.amount().toString(), p.updatedAt().plusSeconds(1)));
            if (loseResponse) { throw new IllegalStateException("Simulated lost response"); }
        }
    }

    private String refundStatus(String paymentId) {
        return jdbc.queryForObject("SELECT status FROM payment_refund_intents WHERE payment_id=?", String.class, paymentId);
    }

    private long notices(String type, String reference) {
        return jdbc.queryForObject("SELECT count(*) FROM external_effects WHERE kind='NOTIFICATION' AND payload->>'type'=?"
                + " AND payload->'data'->>'reference'=?", Long.class, type, reference);
    }
}
