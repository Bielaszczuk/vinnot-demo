package com.vinnot.payment.infrastructure.persistence;

import com.vinnot.event.application.command.model.*;
import com.vinnot.event.application.port.in.*;
import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.domain.valueobject.*;
import com.vinnot.payment.application.port.out.CheckoutAttemptStore;
import com.vinnot.payment.application.service.EventCheckoutReservationService;
import com.vinnot.payment.domain.model.CheckoutSnapshot;
import com.vinnot.payment.domain.model.SellerCredentials;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import com.vinnot.event.application.port.out.PaidEventAvailability;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(properties = {
        "ai.provider=mock", "ai.enabled=false", "ai.spending.paid-calls-enabled=false",
        "app.auth.email.provider=log", "app.storage.provider=local",
        "app.observability.snapshot.enabled=false", "app.effects.poll-ms=3600000"
})
@Import(EventCheckoutReservationPostgresIntegrationTest.Configuration.class)
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class EventCheckoutReservationPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    @MockitoBean
    PaidEventAvailability paidAvailability;
    @Autowired JdbcTemplate jdbc;
    @Autowired EventCheckoutReservationService checkout;
    @Autowired CheckoutAttemptStore attempts;
    @Autowired RegisterForEventUseCase register;
    @Autowired ReviewEventRegistrationUseCase review;
    @Autowired ReportEventPaymentUseCase report;
    @Autowired CancelEventRegistrationUseCase cancel;
    @Autowired EventRegistrationRepositoryPort registrations;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> UUID.randomUUID().toString() + UUID.randomUUID());
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class Configuration {
        @Bean CheckoutAttemptStore checkoutAttemptStore(JdbcTemplate jdbc) { return new PostgresCheckoutAttemptStore(jdbc); }
        @Bean EventCheckoutReservationService eventCheckoutReservationService(EventRepositoryPort events,
                EventRegistrationRepositoryPort registrations, UserRepositoryPort users, CheckoutAttemptStore attempts) {
            return new EventCheckoutReservationService(events, registrations, users,
                    owner -> Optional.of(new SellerCredentials("123", "test-access", "test-refresh", Instant.now().plusSeconds(604800))),
                    attempts, Clock.systemUTC());
        }
    }

    @Test
    void preparationUsesFrozenReservationAmountAndPersistsProviderAuthorityAtomically() {
        var reservation = reservation();
        jdbc.update("UPDATE events SET price=77777 WHERE id=?", reservation.event());
        UUID attempt = prepare(reservation);
        jdbc.update("UPDATE events SET title='New title' WHERE id=?", reservation.event());
        assertThat(prepare(reservation)).isEqualTo(attempt);
        var snapshot = attempts.find(attempt, reservation.buyer()).orElseThrow().snapshot();
        assertThat(snapshot.quote().total()).isEqualByComparingTo("20000");
        assertThat(snapshot.quote().commission()).isEqualByComparingTo("600");
        assertThat(snapshot.title()).isEqualTo("Paid tasting");
        assertThat(registrations.findById(reservation.registration()).orElseThrow().isExternallyManagedPayment()).isTrue();
        checkout.verify(snapshot);
        capacity(reservation, 0, 2);
        assertThatThrownBy(() -> report.execute(new ReportEventPaymentCommand(reservation.registration(), reservation.buyer(), EventPaymentMethod.MERCADO_PAGO)))
                .isInstanceOf(DomainException.class).extracting("code").isEqualTo("PAYMENT_PROVIDER_VERIFICATION_REQUIRED");
        for (var action : List.of(EventRegistrationAction.APPROVE_PAYMENT, EventRegistrationAction.CONFIRM_PAY_AT_VENUE)) {
            assertThatThrownBy(() -> review.execute(new ReviewEventRegistrationCommand(reservation.event(), reservation.registration(),
                    reservation.organizer(), false, action, EventPaymentMethod.TRANSFER, null)))
                    .isInstanceOf(DomainException.class).extracting("code").isEqualTo("PAYMENT_PROVIDER_VERIFICATION_REQUIRED");
            capacity(reservation, 0, 2);
        }
    }

    @Test
    void ledgerFailurePreservesProviderAuthorityEstablishedAtRegistration() {
        var reservation = reservation();
        jdbc.execute("ALTER TABLE payment_checkout_attempts ADD CONSTRAINT fixture_checkout_failure CHECK (event_id <> '" + reservation.event() + "'::uuid)");
        try {
            assertThatThrownBy(() -> prepare(reservation)).isInstanceOf(DataIntegrityViolationException.class);
            assertThat(registrations.findById(reservation.registration()).orElseThrow().isExternallyManagedPayment()).isTrue();
            assertThat(attempts.findByRegistration(reservation.registration(), reservation.buyer())).isEmpty();
            capacity(reservation, 0, 2);
        } finally { jdbc.execute("ALTER TABLE payment_checkout_attempts DROP CONSTRAINT fixture_checkout_failure"); }
    }

    @Test
    void simultaneousPreparationCreatesOneAttemptWithoutConsumingMoreCapacity() throws Exception {
        var reservation = reservation();
        var start = new CountDownLatch(1);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var first = executor.submit(() -> { start.await(); return prepare(reservation); });
            var second = executor.submit(() -> { start.await(); return prepare(reservation); });
            start.countDown();
            assertThat(first.get(15, TimeUnit.SECONDS)).isEqualTo(second.get(15, TimeUnit.SECONDS));
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_checkout_attempts WHERE registration_id=?", Integer.class, reservation.registration())).isEqualTo(1);
        capacity(reservation, 0, 2);
    }

    @Test
    void cancellationExpirationAndAccountLockInvalidatePreviouslyPreparedCheckout() {
        var cancelled = reservation();
        var snapshot = snapshot(cancelled);
        cancel.execute(new CancelEventRegistrationCommand(cancelled.event(), cancelled.buyer()));
        assertThatThrownBy(() -> checkout.verify(snapshot)).isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> prepare(cancelled)).isInstanceOf(DomainException.class);
        capacity(cancelled, 0, 0);
        var expired = reservation();
        var expiredSnapshot = snapshot(expired);
        jdbc.update("UPDATE event_registrations SET expires_at=now()-interval '1 second' WHERE id=?", expired.registration());
        assertThatThrownBy(() -> checkout.verify(expiredSnapshot)).isInstanceOf(DomainException.class);
        var locked = reservation();
        var lockedSnapshot = snapshot(locked);
        jdbc.update("UPDATE users SET locked=true WHERE id=?", locked.organizer());
        assertThatThrownBy(() -> checkout.verify(lockedSnapshot)).isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> checkout.prepare(locked.event(), locked.registration(), UUID.randomUUID())).isInstanceOf(DomainException.class);
    }

    @Test
    void preparationAndCancellationUseSameLockOrderWithoutDeadlock() throws Exception {
        var reservation = reservation();
        var start = new CountDownLatch(1);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var preparing = executor.submit(() -> {
                start.await();
                try { return Optional.of(prepare(reservation)); } catch (DomainException unavailable) { return Optional.<UUID>empty(); }
            });
            var cancelling = executor.submit(() -> { start.await(); cancel.execute(new CancelEventRegistrationCommand(reservation.event(), reservation.buyer())); return true; });
            start.countDown();
            var result = preparing.get(15, TimeUnit.SECONDS);
            assertThat(cancelling.get(15, TimeUnit.SECONDS)).isTrue();
            assertThat(registrations.findById(reservation.registration()).orElseThrow().getStatus().name()).isEqualTo("CANCELLED");
            result.ifPresent(id -> assertThatThrownBy(() -> checkout.verify(attempts.find(id, reservation.buyer()).orElseThrow().snapshot())).isInstanceOf(DomainException.class));
        }
        capacity(reservation, 0, 0);
    }

    @Test
    void cancelledBuyerCanRegisterAgainWhileKeepingTheOldRecordAndCapacityConsistent() {
        var previous = reservation();
        cancel.execute(new CancelEventRegistrationCommand(previous.event(), previous.buyer()));
        var next = register.execute(new RegisterForEventCommand(previous.event(), previous.buyer(), 2,
                null, null, null, null, List.of(), null, false));
        assertThat(next.id()).isNotEqualTo(previous.registration());
        assertThat(next.status()).isEqualTo("AWAITING_PAYMENT");
        assertThat(registrations.findById(previous.registration()).orElseThrow().getStatus()).isEqualTo(EventRegistrationStatus.CANCELLED);
        capacity(previous, 0, 2);
    }

    private UUID prepare(Reservation r) { return checkout.prepare(r.event(), r.registration(), r.buyer()); }
    private CheckoutSnapshot snapshot(Reservation r) { return attempts.find(prepare(r), r.buyer()).orElseThrow().snapshot(); }
    private Reservation reservation() {
        UUID organizer = user(), buyer = user(), event = UUID.randomUUID();
        jdbc.update("INSERT INTO user_roles(user_id,role_id) SELECT ?,id FROM roles WHERE name='ROLE_PARTNER'", organizer);
        jdbc.update("""
                INSERT INTO events(id,title,event_type,start_date,end_date,organizer_id,status,published_once,
                    price,max_attendees,max_tickets_per_registration,approval_mode,attendee_confirmation_required)
                VALUES (?,'Paid tasting','TASTING',now()+interval '2 days',now()+interval '3 days',?,'PUBLISHED',true,10000,2,4,'AUTOMATIC',false)
                """, event, organizer);
        var registered = register.execute(new RegisterForEventCommand(event, buyer, 2, null, null, null, null, List.of(), null, false));
        return new Reservation(event, registered.id(), buyer, organizer);
    }
    private UUID user() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name) VALUES (?,?,?,'fixture','Test','Guest')", id, "user-"+id, id+"@example.invalid");
        return id;
    }
    private void capacity(Reservation r, int confirmed, int held) {
        assertThat(jdbc.queryForObject("SELECT current_attendees FROM events WHERE id=?", Integer.class, r.event())).isEqualTo(confirmed);
        assertThat(jdbc.queryForObject("SELECT held_attendees FROM events WHERE id=?", Integer.class, r.event())).isEqualTo(held);
    }
    private record Reservation(UUID event, UUID registration, UUID buyer, UUID organizer) { }
}
