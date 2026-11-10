package com.vinnot.shared.infrastructure;

import com.vinnot.event.application.port.out.EventRegistrationPointsPort;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import tools.jackson.databind.ObjectMapper;
import com.vinnot.shared.application.port.TokenService;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.infrastructure.effects.*;
import com.vinnot.user.application.command.handler.RefreshTokenCommandHandler;
import com.vinnot.user.application.service.RefreshTokenReuseResponder;
import com.vinnot.user.application.command.model.RefreshTokenCommand;
import com.vinnot.user.application.command.response.AuthSessionResponse;
import com.vinnot.user.application.service.AuthSessionResponseFactory;
import com.vinnot.user.application.service.RefreshTokenHasher;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.infrastructure.persistence.adapter.*;
import com.vinnot.wine.infrastructure.persistence.adapter.WineSubmissionPersistenceAdapter;
import com.vinnot.wine.infrastructure.persistence.jpa.WineSubmissionJpaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import com.vinnot.event.application.command.handler.ConfirmEventAttendanceCommandHandler;
import com.vinnot.event.application.command.model.ConfirmEventAttendanceCommand;
import com.vinnot.event.infrastructure.persistence.adapter.EventPersistenceAdapter;
import com.vinnot.event.infrastructure.persistence.adapter.EventRegistrationPersistenceAdapter;
import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.shared.infrastructure.security.JwtTokenService;
import com.vinnot.shared.infrastructure.storage.StorageCleanupEffectHandler;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Future;
import org.springframework.dao.OptimisticLockingFailureException;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@DataJpaTest(properties = {"spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate", "spring.jpa.show-sql=false"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({RefreshTokenPersistenceAdapter.class, UserPersistenceAdapter.class,
        AccountDeletionIntegrity.class, AccountAccessAdapter.class, DurableEffectQueue.class, ObjectMapper.class,
        EventPersistenceAdapter.class,
        EventRegistrationPersistenceAdapter.class})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class Issue124PostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactions;
    @Autowired RefreshTokenPersistenceAdapter tokens;
    @Autowired UserPersistenceAdapter users;
    @Autowired AccountAccessAdapter access;
    @Autowired WineSubmissionJpaRepository submissions;
    @Autowired EventPersistenceAdapter events;
    /** The points module is outside this slice (#455). */
    @MockitoBean EventRegistrationPointsPort points;
    @Autowired EventRegistrationPersistenceAdapter registrations;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Test
    void repeatedDurableOperationRecoversOneSuccessorAndCannotUndoLogout() throws Exception {
        UUID user = account();
        String raw = UUID.randomUUID().toString();
        String hash = RefreshTokenHasher.hash(raw);
        UUID operation = UUID.randomUUID();
        tx().executeWithoutResult(status -> tokens.save(user, hash, Instant.now().plusSeconds(600), 0));
        TokenService service = new JwtTokenService(
                "integration-test-secret-with-at-least-thirty-two-bytes", 900_000L, 604_800_000L);
        var factory = mock(AuthSessionResponseFactory.class);
        when(factory.create(any(), anyString())).thenAnswer(call ->
                new AuthSessionResponse("access", call.getArgument(1), "Bearer", 1000, null));
        var handler = new RefreshTokenCommandHandler(tokens, users, service, factory, mock(RefreshTokenReuseResponder.class));
        var successors = ConcurrentHashMap.<String>newKeySet();
        race(6, () -> successors.add(tx().execute(status ->
                handler.execute(new RefreshTokenCommand(raw, operation))).refreshToken()));
        assertThat(successors).hasSize(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM refresh_tokens WHERE user_id = ?", Integer.class, user)).isEqualTo(2);
        assertThatThrownBy(() -> tx().execute(status -> handler.execute(new RefreshTokenCommand(raw, UUID.randomUUID()))))
                .isInstanceOf(BusinessRuleViolationException.class);
        tx().executeWithoutResult(status -> tokens.revoke(hash, "logout", null));
        assertThatThrownBy(() -> tx().execute(status -> handler.execute(new RefreshTokenCommand(raw, operation))))
                .isInstanceOf(BusinessRuleViolationException.class);
    }

    @Test
    void concurrentRefreshHasExactlyOneWinnerAndLogoutRevokesItsDescendant() throws Exception {
        UUID user = account();
        String raw = UUID.randomUUID().toString();
        String hash = RefreshTokenHasher.hash(raw);
        tx().executeWithoutResult(status -> tokens.save(user, hash, Instant.now().plusSeconds(600), 0));
        TokenService tokenService = mock(TokenService.class);
        when(tokenService.generateRefreshToken()).thenAnswer(call -> UUID.randomUUID().toString());
        when(tokenService.getRefreshTokenExpiration()).thenReturn(600_000L);
        AuthSessionResponseFactory factory = mock(AuthSessionResponseFactory.class);
        when(factory.create(any(), anyString())).thenAnswer(call -> new AuthSessionResponse("access", call.getArgument(1), "Bearer", 1000, null));
        var handler = new RefreshTokenCommandHandler(tokens, users, tokenService, factory, mock(RefreshTokenReuseResponder.class));
        AtomicInteger successful = new AtomicInteger();
        race(6, () -> {
            try {
                tx().execute(status -> handler.execute(new RefreshTokenCommand(raw)));
                successful.incrementAndGet();
            } catch (BusinessRuleViolationException exception) {
                assertThat(exception.getCode()).isEqualTo("INVALID_TOKEN");
            }
        });
        assertThat(successful).hasValue(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM refresh_tokens WHERE user_id = ? AND revoked_at IS NULL", Integer.class, user)).isEqualTo(1);
        tx().executeWithoutResult(status -> tokens.revoke(hash, "logout", null));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM refresh_tokens WHERE user_id = ? AND revoked_at IS NULL", Integer.class, user)).isZero();
    }

    @Test
    void passwordChangeInvalidatesBothTokenKindsAndRejectsStaleAggregateWrites() {
        UUID id = account();
        var stale = tx().execute(status -> users.findById(id).orElseThrow());
        tx().executeWithoutResult(status -> {
            var fresh = users.findById(id).orElseThrow();
            fresh.changePassword(Password.fromHash("new-hash"));
            users.save(fresh);
        });
        assertThat(access.permits(id, List.of("ROLE_USER"), 0)).isFalse();
        assertThat(access.permits(id, List.of("ROLE_USER"), 1)).isTrue();
        stale.recordLogin();
        assertThatThrownBy(() -> tx().execute(status -> users.save(stale)))
                .isInstanceOf(OptimisticLockingFailureException.class);
        assertThat(jdbc.queryForObject("SELECT password FROM users WHERE id = ?", String.class, id)).isEqualTo("new-hash");

        String raw = UUID.randomUUID().toString();
        tx().executeWithoutResult(status -> tokens.save(id, RefreshTokenHasher.hash(raw), Instant.now().plusSeconds(600), 0));
        var handler = new RefreshTokenCommandHandler(tokens, users, mock(TokenService.class), mock(AuthSessionResponseFactory.class),
                mock(RefreshTokenReuseResponder.class));
        assertThatThrownBy(() -> tx().execute(status -> handler.execute(new RefreshTokenCommand(raw))))
                .isInstanceOf(BusinessRuleViolationException.class).extracting("code").isEqualTo("INVALID_TOKEN");
    }

    @Test
    void concurrentSubmissionDecisionsHaveOneWinner() throws Exception {
        UUID user = account();
        UUID submission = UUID.randomUUID();
        jdbc.update("INSERT INTO wine_submissions(id, submitted_by, wine_name, winery_name, status) VALUES (?, ?, 'Reserva', 'Estate', 'NEEDS_REVIEW')", submission, user);
        var adapter = new WineSubmissionPersistenceAdapter(submissions);
        AtomicInteger decisions = new AtomicInteger();
        race(2, () -> {
            try {
                tx().executeWithoutResult(status -> {
                    var proposal = adapter.findByIdForUpdate(submission).orElseThrow();
                    proposal.assertReviewable();
                    proposal.rejectByAdmin(user, "Reviewed duplicate");
                    adapter.save(proposal);
                });
                decisions.incrementAndGet();
            } catch (DomainException exception) {
                assertThat(exception.getCode()).isEqualTo("INVALID_SUBMISSION_TRANSITION");
            }
        });
        assertThat(decisions).hasValue(1);
        assertThat(jdbc.queryForObject("SELECT status FROM wine_submissions WHERE id = ?", String.class, submission)).isEqualTo("REJECTED");
    }

    @Test
    void accountDeletionReconcilesReviewAndRegistrationProjections() {
        UUID deletedUser = account();
        UUID remainingUser = account();
        UUID wine = UUID.randomUUID();
        UUID event = UUID.randomUUID();
        jdbc.update("INSERT INTO wines(id, name, wine_type, rating_count, rating_average) VALUES (?, 'Test wine', 'RED', 2, 3)", wine);
        jdbc.update("INSERT INTO reviews(publication_status, id, wine_id, user_id, rating) VALUES ('APPROVED', ?, ?, ?, 2), ('APPROVED', ?, ?, ?, 4)",
                UUID.randomUUID(), wine, deletedUser, UUID.randomUUID(), wine, remainingUser);
        jdbc.update("""
                INSERT INTO events(id, title, event_type, start_date, end_date, status, max_attendees, current_attendees, held_attendees, organizer_id)
                VALUES (?, 'Test event', 'TASTING', CURRENT_TIMESTAMP + INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '3 days', 'SOLD_OUT', 3, 1, 2, ?)
                """, event, remainingUser);
        jdbc.update("""
                INSERT INTO event_registrations(id, event_id, user_id, attendee_count, status)
                VALUES (?, ?, ?, 2, 'AWAITING_PAYMENT'), (?, ?, ?, 1, 'CONFIRMED')
                """, UUID.randomUUID(), event, deletedUser, UUID.randomUUID(), event, remainingUser);
        tx().executeWithoutResult(status -> users.deleteById(deletedUser));
        assertThat(jdbc.queryForObject("SELECT rating_count FROM wines WHERE id = ?", Integer.class, wine)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT rating_average FROM wines WHERE id = ?", Double.class, wine)).isEqualTo(4);
        assertThat(jdbc.queryForObject("SELECT held_attendees FROM events WHERE id = ?", Integer.class, event)).isZero();
        assertThat(jdbc.queryForObject("SELECT current_attendees FROM events WHERE id = ?", Integer.class, event)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT status FROM events WHERE id = ?", String.class, event)).isEqualTo("PUBLISHED");
    }

    @Test
    void newlyConstructedWorkerResumesCommittedNotificationAndCleanupJobs() {
        ObjectMapper mapper = new ObjectMapper();
        String notification = UUID.randomUUID().toString();
        String cleanup = UUID.randomUUID().toString();
        var producer = new DurableEffectQueue(jdbc, mapper);
        tx().executeWithoutResult(status -> {
            producer.enqueue("probe-notification", notification, Map.of("fixture", true), Duration.ZERO);
            producer.enqueue("probe-cleanup", cleanup, Map.of("fixture", true), Duration.ZERO);
        });
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM external_effects WHERE deduplication_key IN (?, ?)",
                Integer.class, notification, cleanup)).isEqualTo(2);
        makeEffectDue(notification);
        makeEffectDue(cleanup);
        ExternalEffectHandler safeHandler = mock(ExternalEffectHandler.class);
        when(safeHandler.supports("probe-notification")).thenReturn(true);
        when(safeHandler.supports("probe-cleanup")).thenReturn(true);
        var recreatedWorker = new DurableEffectWorker(new JdbcTemplate(jdbc.getDataSource()),
                new ObjectMapper(), List.of(safeHandler), transactions);
        recreatedWorker.drain();
        verify(safeHandler).execute(eq("probe-notification"), eq(Map.of("fixture", true)));
        verify(safeHandler).execute(eq("probe-cleanup"), eq(Map.of("fixture", true)));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM external_effects WHERE deduplication_key IN (?, ?)",
                Integer.class, notification, cleanup)).isZero();
    }

    @Test
    void outboxRollsBackWithDecisionAndRetriesCommittedFailures() {
        ObjectMapper mapper = new ObjectMapper();
        var queue = new DurableEffectQueue(jdbc, mapper);
        String key = UUID.randomUUID().toString();
        tx().executeWithoutResult(status -> {
            queue.enqueue("probe", key, Map.of("value", "test"), Duration.ZERO);
            status.setRollbackOnly();
        });
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM external_effects WHERE deduplication_key = ?", Integer.class, key)).isZero();
        tx().executeWithoutResult(status -> queue.enqueue("probe", key, Map.of(), Duration.ZERO));
        makeEffectDue(key);
        ExternalEffectHandler handler = mock(ExternalEffectHandler.class);
        when(handler.supports("probe")).thenReturn(true);
        doThrow(new IllegalStateException("provider unavailable")).doNothing().when(handler).execute(anyString(), any());
        var worker = new DurableEffectWorker(jdbc, mapper, List.of(handler), transactions);
        worker.drain();
        assertThat(jdbc.queryForObject("SELECT attempts FROM external_effects WHERE deduplication_key = ?", Integer.class, key)).isEqualTo(1);
        makeEffectDue(key);
        worker.drain();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM external_effects WHERE deduplication_key = ?", Integer.class, key)).isZero();
        verify(handler, times(2)).execute(anyString(), any());
    }

    private void makeEffectDue(String key) {
        // These tests exercise delivery, not clock synchronization between the JVM and the DB container.
        assertThat(jdbc.update("UPDATE external_effects SET next_attempt_at = CURRENT_TIMESTAMP - INTERVAL '1 minute' "
                + "WHERE deduplication_key = ?", key)).isEqualTo(1);
    }


    @Test
    void cancellationRacingWithConfirmationLeavesNoActiveRegistrationOrCapacity() throws Exception {
        UUID user = account();
        UUID event = UUID.randomUUID();
        UUID registration = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO events(id, title, event_type, start_date, end_date, status, max_attendees, current_attendees, held_attendees, organizer_id)
                VALUES (?, 'Concurrency event', 'TASTING', CURRENT_TIMESTAMP + INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '3 days', 'SOLD_OUT', 1, 0, 1, ?)
                """, event, user);
        jdbc.update("""
                INSERT INTO event_registrations(id, event_id, user_id, attendee_count, status, expires_at)
                VALUES (?, ?, ?, 1, 'AWAITING_ATTENDEE_CONFIRMATION', CURRENT_TIMESTAMP + INTERVAL '1 hour')
                """, registration, event, user);
        var confirmation = new ConfirmEventAttendanceCommandHandler(events, registrations);
        AtomicInteger operation = new AtomicInteger();
        race(2, () -> {
            if (operation.getAndIncrement() == 0) {
                tx().executeWithoutResult(status -> {
                    var current = events.findByIdForUpdate(event).orElseThrow();
                    current.cancel();
                    events.save(current);
                });
            } else {
                try {
                    tx().execute(status -> confirmation.execute(new ConfirmEventAttendanceCommand(registration, user)));
                } catch (DomainException expected) {
                    assertThat(expected.getCode()).isEqualTo("NOT_AVAILABLE");
                }
            }
        });
        assertThat(jdbc.queryForObject("SELECT status FROM event_registrations WHERE id = ?", String.class, registration)).isEqualTo("CANCELLED");
        assertThat(jdbc.queryForObject("SELECT current_attendees + held_attendees FROM events WHERE id = ?", Integer.class, event)).isZero();
    }

    @Test
    void storageCleanupProtectsReferencedObjectsAndDeletesOnlyUnreferencedOnes() {
        UUID user = account();
        String url = "/api/uploads/avatars/avatar_" + user + "_fixture.png";
        jdbc.update("UPDATE users SET profile_image_url = ? WHERE id = ?", url, user);
        var physical = mock(FileStoragePort.class);
        var handler = new StorageCleanupEffectHandler(physical, jdbc);
        var payload = Map.<String, Object>of("owner", user.toString(), "url", url);
        handler.execute("avatar-cleanup", payload);
        verify(physical, never()).deleteAvatar(anyString(), any());
        jdbc.update("UPDATE users SET profile_image_url = NULL WHERE id = ?", user);
        handler.execute("avatar-cleanup", payload);
        verify(physical).deleteAvatar(url, user);

        UUID submission = UUID.randomUUID();
        UUID wine = UUID.randomUUID();
        jdbc.update("INSERT INTO wines(id, name, wine_type, image_url) VALUES (?, 'Retained image', 'RED', ?)",
                wine, "/api/uploads/wine-labels/wine_label_" + submission + ".jpg");
        var label = Map.<String, Object>of("owner", submission.toString());
        handler.execute("public-label-cleanup", label);
        verify(physical, never()).deletePublicWineLabel(any());
        jdbc.update("UPDATE wines SET image_url = NULL WHERE id = ?", wine);
        handler.execute("public-label-cleanup", label);
        verify(physical).deletePublicWineLabel(submission);
    }

    private TransactionTemplate tx() { return new TransactionTemplate(transactions); }

    private UUID account() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id, username, email, password, first_name, last_name, email_verified) VALUES (?, ?, ?, 'old-hash', 'Test', 'User', true)", id, id.toString(), id + "@example.com");
        jdbc.update("INSERT INTO user_roles(user_id, role_id) SELECT ?, id FROM roles WHERE name = 'ROLE_USER'", id);
        return id;
    }

    private void race(int count, Runnable operation) throws Exception {
        CountDownLatch start = new CountDownLatch(1);
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<?>> pending = new ArrayList<>();
            for (int index = 0; index < count; index++) {
                pending.add(pool.submit(() -> {
                    start.await();
                    operation.run();
                    return null;
                }));
            }
            start.countDown();
            for (var result : pending) { result.get(15, TimeUnit.SECONDS); }
        }
    }
}
