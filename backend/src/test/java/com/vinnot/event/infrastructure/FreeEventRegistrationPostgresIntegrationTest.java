package com.vinnot.event.infrastructure;

import com.vinnot.event.application.command.model.CancelEventCommand;
import com.vinnot.event.application.command.model.CancelEventRegistrationCommand;
import com.vinnot.event.application.command.model.ConfirmEventAttendanceCommand;
import com.vinnot.event.application.command.model.RegisterForEventCommand;
import com.vinnot.event.application.command.model.ReviewEventRegistrationCommand;
import com.vinnot.event.application.port.in.CancelEventRegistrationUseCase;
import com.vinnot.event.application.port.in.CancelEventUseCase;
import com.vinnot.event.application.port.in.ConfirmEventAttendanceUseCase;
import com.vinnot.event.application.port.in.RegisterForEventUseCase;
import com.vinnot.event.application.port.in.ReviewEventRegistrationUseCase;
import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.event.application.service.EventHoldExpirationService;
import com.vinnot.event.domain.valueobject.EventRegistrationAction;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.user.application.command.model.UpdateUserProfileCommand;
import com.vinnot.user.application.port.in.UpdateUserProfileUseCase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.springframework.dao.DataIntegrityViolationException;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Real transactions and row locks: no deployed data, outbound messages or payment providers. */
@SpringBootTest(properties = {
        "ai.provider=mock", "ai.enabled=false", "ai.spending.paid-calls-enabled=false",
        "app.auth.email.provider=log", "app.storage.provider=local",
        "app.observability.snapshot.enabled=false", "app.effects.poll-ms=3600000"
})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class FreeEventRegistrationPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    @Autowired JdbcTemplate jdbc;
    @Autowired RegisterForEventUseCase register;
    @Autowired ReviewEventRegistrationUseCase review;
    @Autowired ConfirmEventAttendanceUseCase confirm;
    @Autowired CancelEventRegistrationUseCase cancel;
    @Autowired CancelEventUseCase cancelEvent;
    @Autowired UpdateUserProfileUseCase updateProfile;
    @Autowired EventHoldExpirationService expiration;
    @Autowired EventRegistrationRepositoryPort registrations;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> UUID.randomUUID().toString() + UUID.randomUUID());
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Test
    void contactOptInIsExplicitAndReservationSnapshotsSurviveProfileChanges() {
        UUID user = user();
        UUID event = event(user(), "AUTOMATIC", false);
        updateProfile.execute(new UpdateUserProfileCommand(user, null, null, null, null, "+1 415 555 2671"));
        var first = register.execute(command(event, user, "+54 9 11 2345-6789", false));
        assertThat(first.contactPhone()).isEqualTo("+5491123456789");
        assertThat(phone(user)).isEqualTo("+14155552671");
        var second = register.execute(command(event(user(), "MANUAL", false), user, "+44 20 7946 0018", true));
        assertThat(phone(user)).isEqualTo("+442079460018");
        assertThat(second.status()).isEqualTo("REQUESTED");
        var legacy = register.execute(command(event(user(), "MANUAL", false), user, null, false));
        assertThat(legacy.contactPhone()).isEqualTo("+442079460018");
        updateProfile.execute(new UpdateUserProfileCommand(user, null, null, null, null, ""));
        assertThat(phone(user)).isNull();
        assertThat(registrations.findById(first.id()).orElseThrow().getContactPhone()).isEqualTo("+5491123456789");
        assertThat(registrations.findById(second.id()).orElseThrow().getContactPhone()).isEqualTo("+442079460018");
    }

    @Test
    void invalidContactDoesNotCreateReservationsOrConsumeCapacity() {
        UUID user = user();
        UUID event = event(user(), "AUTOMATIC", false);
        for (String phone : List.of("123", "")) {
            assertThatThrownBy(() -> register.execute(command(event, user, phone, true)))
                    .isInstanceOf(DomainException.class).extracting("code").isEqualTo("INVALID_PHONE_NUMBER");
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM event_registrations WHERE event_id=?", Integer.class, event)).isZero();
        assertCapacity(event, 0, 0);
        assertThat(phone(user)).isNull();
    }

    @Test
    void profileStorageFailureRollsBackTheReservationAndCapacity() {
        UUID attendee = user();
        UUID event = event(user(), "AUTOMATIC", false);
        jdbc.execute("ALTER TABLE users ADD CONSTRAINT test_phone_storage_failure CHECK (phone_number <> '+442079460018')");
        try {
            assertThatThrownBy(() -> register.execute(command(event, attendee, "+44 20 7946 0018", true)))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM event_registrations WHERE event_id=?", Integer.class, event)).isZero();
            assertCapacity(event, 0, 0);
            assertThat(phone(attendee)).isNull();
        } finally {
            jdbc.execute("ALTER TABLE users DROP CONSTRAINT test_phone_storage_failure");
        }
    }

    @Test
    void competingRegistrationsCannotOversellTheLastSpot() throws Exception {
        UUID event = event(user(), "AUTOMATIC", false);
        UUID first = user();
        UUID second = user();
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var one = executor.submit(() -> {
                start.await(5, TimeUnit.SECONDS);
                return register.execute(command(event, first, null, false)).status();
            });
            var two = executor.submit(() -> {
                start.await(5, TimeUnit.SECONDS);
                return register.execute(command(event, second, null, false)).status();
            });
            start.countDown();
            assertThat(List.of(one.get(15, TimeUnit.SECONDS), two.get(15, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder("CONFIRMED", "WAITLISTED");
        }
        assertCapacity(event, 1, 0);
    }

    @Test
    void manualApprovalHoldsThenConfirmsAndCancellationReleasesTheSpot() {
        UUID organizer = user();
        UUID attendee = user();
        UUID event = event(organizer, "MANUAL", true);
        var request = register.execute(command(event, attendee, null, false));
        assertThat(request.status()).isEqualTo("REQUESTED");
        assertCapacity(event, 0, 0);
        assertThatThrownBy(() -> review.execute(new ReviewEventRegistrationCommand(
                event, request.id(), attendee, false, EventRegistrationAction.APPROVE, null, null)))
                .isInstanceOf(DomainException.class);
        var approved = review.execute(new ReviewEventRegistrationCommand(
                event, request.id(), organizer, false, EventRegistrationAction.APPROVE, null, null));
        assertThat(approved.status()).isEqualTo("AWAITING_ATTENDEE_CONFIRMATION");
        assertCapacity(event, 0, 1);
        assertThat(points(attendee)).isZero();
        assertThat(confirm.execute(new ConfirmEventAttendanceCommand(request.id(), attendee)).status()).isEqualTo("CONFIRMED");
        assertCapacity(event, 1, 0);
        assertThat(points(attendee)).isEqualTo(4);
        cancel.execute(new CancelEventRegistrationCommand(event, attendee));
        assertCapacity(event, 0, 0);
        assertThat(points(attendee)).isZero();
    }

    @Test
    void cancellingTheEventTakesBackTheRegistrationPoints() {
        UUID organizer = user();
        UUID attendee = user();
        UUID event = event(organizer, "AUTOMATIC", false);
        assertThat(register.execute(command(event, attendee, null, false)).status()).isEqualTo("CONFIRMED");
        assertThat(points(attendee)).isEqualTo(4);
        cancelEvent.execute(new CancelEventCommand(event, organizer, false));
        assertThat(points(attendee)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_point_movements WHERE user_id=? AND points < 0",
                Integer.class, attendee)).isEqualTo(1);
    }

    @Test
    void expiredHoldsRejectConfirmationAndReleaseExactlyOnce() {
        UUID attendee = user();
        UUID event = event(user(), "AUTOMATIC", true);
        var request = register.execute(command(event, attendee, null, false));
        jdbc.update("UPDATE event_registrations SET expires_at=now()-interval '1 minute' WHERE id=?", request.id());
        assertThatThrownBy(() -> confirm.execute(new ConfirmEventAttendanceCommand(request.id(), attendee)))
                .isInstanceOf(DomainException.class);
        assertCapacity(event, 0, 1);
        var candidate = registrations.findById(request.id()).orElseThrow();
        expiration.expire(candidate, Instant.now());
        expiration.expire(candidate, Instant.now());
        assertCapacity(event, 0, 0);
        assertThat(registrations.findById(request.id()).orElseThrow().getStatus().name()).isEqualTo("EXPIRED");
        assertThat(points(attendee)).isZero();
        assertThat(register.execute(command(event, user(), null, false)).status()).isEqualTo("AWAITING_ATTENDEE_CONFIRMATION");
    }

    private RegisterForEventCommand command(UUID event, UUID user, String phone, boolean save) {
        return new RegisterForEventCommand(event, user, 1, null, null, phone, null, List.of(), null, save);
    }

    private UUID user() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name) VALUES (?,?,?,'fixture','Test','Guest')",
                id, "user-" + id, id + "@example.invalid");
        return id;
    }

    private UUID event(UUID organizer, String mode, boolean confirmation) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO events(id,title,event_type,start_date,end_date,organizer_id,status,published_once,
                    max_attendees,max_tickets_per_registration,approval_mode,attendee_confirmation_required)
                VALUES (?,'Free tasting','TASTING',now()+interval '2 days',now()+interval '3 days',?,'PUBLISHED',true,1,4,?,?)
                """, id, organizer, mode, confirmation);
        return id;
    }

    private int points(UUID user) {
        return jdbc.queryForObject("SELECT COALESCE(SUM(points), 0) FROM user_point_movements WHERE user_id=?",
                Integer.class, user);
    }

    private String phone(UUID user) {
        return jdbc.queryForObject("SELECT phone_number FROM users WHERE id=?", String.class, user);
    }

    private void assertCapacity(UUID event, int confirmed, int held) {
        assertThat(jdbc.queryForObject("SELECT current_attendees FROM events WHERE id=?", Integer.class, event)).isEqualTo(confirmed);
        assertThat(jdbc.queryForObject("SELECT held_attendees FROM events WHERE id=?", Integer.class, event)).isEqualTo(held);
    }
}
