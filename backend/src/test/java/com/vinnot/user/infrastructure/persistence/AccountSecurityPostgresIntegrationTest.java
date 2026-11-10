package com.vinnot.user.infrastructure.persistence;

import com.vinnot.notification.application.port.in.ManagePushDevicesUseCase;
import com.vinnot.shared.application.port.TokenService;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.infrastructure.effects.DurableEffectQueue;
import com.vinnot.user.application.command.handler.RefreshTokenCommandHandler;
import com.vinnot.user.application.command.model.RefreshTokenCommand;
import com.vinnot.user.application.command.response.AuthSessionResponse;
import com.vinnot.user.application.port.out.RequestOriginPort;
import com.vinnot.user.application.port.out.model.RequestOrigin;
import com.vinnot.user.application.service.AccountSecurityNoticeService;
import com.vinnot.user.application.service.AuthSessionResponseFactory;
import com.vinnot.user.application.service.LoginAttemptRecorder;
import com.vinnot.user.application.service.LoginLockStarter;
import com.vinnot.user.application.service.RefreshTokenHasher;
import com.vinnot.user.application.service.RefreshTokenReuseResponder;
import com.vinnot.user.application.service.SecurityEventRecorder;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.SecurityEventType;
import com.vinnot.user.infrastructure.config.LoginLockoutConfiguration;
import com.vinnot.user.infrastructure.persistence.adapter.AccountDeletionIntegrity;
import com.vinnot.user.infrastructure.persistence.adapter.JdbcSecurityEventAdapter;
import com.vinnot.user.infrastructure.persistence.adapter.LoginAttemptPersistenceAdapter;
import com.vinnot.user.infrastructure.persistence.adapter.RefreshTokenPersistenceAdapter;
import com.vinnot.user.infrastructure.persistence.adapter.UserPersistenceAdapter;
import com.vinnot.user.application.port.out.model.SecurityEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * #482 against PostgreSQL: the lockout columns (V72), the security events (V73), and the transactions that keep a
 * detected refresh-token reuse although the request itself fails and rolls back. The lock is decided in each statement,
 * so parallel attempts start it once and nothing counts or clears it while it runs.
 */
@DataJpaTest(properties = {"spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate", "spring.jpa.show-sql=false"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({UserPersistenceAdapter.class, AccountDeletionIntegrity.class, DurableEffectQueue.class, ObjectMapper.class,
        RefreshTokenPersistenceAdapter.class, LoginAttemptPersistenceAdapter.class, JdbcSecurityEventAdapter.class,
        SecurityEventRecorder.class, LoginAttemptRecorder.class, LoginLockStarter.class, RefreshTokenReuseResponder.class,
        LoginLockoutConfiguration.class})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class AccountSecurityPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactions;
    @Autowired UserPersistenceAdapter users;
    @Autowired RefreshTokenPersistenceAdapter tokens;
    @Autowired LoginAttemptPersistenceAdapter attempts;
    @Autowired JdbcSecurityEventAdapter events;
    @Autowired LoginAttemptRecorder loginAttempts;
    @Autowired RefreshTokenReuseResponder reuse;
    @MockitoBean RequestOriginPort origins;
    @MockitoBean AccountSecurityNoticeService notices;
    @MockitoBean ManagePushDevicesUseCase pushDevices;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @BeforeEach
    void origin() {
        when(origins.current()).thenReturn(new RequestOrigin("203.0.113.9", "Mozilla/5.0 " + "x".repeat(400)));
    }

    @Test
    void parallelWrongPasswordsAreAllCountedAndOnlyOneStartsTheLock() throws Exception {
        UUID id = account();
        race(8, () -> attempts.recordFailure(id, Instant.now()));
        assertThat(failures(id)).isEqualTo(8);

        Instant until = Instant.now().plusSeconds(900);
        AtomicInteger started = new AtomicInteger();
        race(4, () -> {
            if (attempts.startLock(id, 5, Instant.now(), until)) {
                started.incrementAndGet();
            }
        });
        assertThat(started).hasValue(1);
        assertThat(failures(id)).isZero();
        User loaded = users.findById(id).orElseThrow();
        assertThat(loaded.isLoginLockedAt(Instant.now())).isTrue();
        assertThat(loaded.getLoginLockedUntil()).isCloseTo(until, within(1, ChronoUnit.MILLIS));

        assertThat(attempts.recordFailure(UUID.randomUUID(), Instant.now())).as("unknown account").isZero();
        assertThat(attempts.startLock(id, 0, Instant.now(), until)).as("a running lock is never started again").isFalse();
    }

    @Test
    void whileALockRunsNothingCountsOrClearsItAndOnceItEndsEverythingDoes() {
        UUID id = account();
        Instant now = Instant.now();
        Instant until = now.plusSeconds(900);
        attempts.recordFailure(id, now);
        assertThat(attempts.startLock(id, 1, now, until)).isTrue();

        assertThat(attempts.recordFailure(id, now)).as("refused, not counted").isZero();
        assertThat(failures(id)).isZero();
        assertThat(attempts.activeLock(id, now)).hasValueSatisfying(end -> assertThat(end).isCloseTo(until, within(1, ChronoUnit.MILLIS)));
        attempts.clearFailures(id, now);
        assertThat(attempts.activeLock(id, now)).as("a right password does not clear a running lock").isPresent();

        Instant later = until.plusSeconds(1);
        assertThat(attempts.activeLock(id, later)).isEmpty();
        assertThat(attempts.recordFailure(id, later)).isEqualTo(1);
        attempts.clearFailures(id, later);
        assertThat(failures(id)).isZero();
        assertThat(jdbc.queryForObject("SELECT login_locked_until FROM users WHERE id = ?", Timestamp.class, id)).isNull();
        assertThat(attempts.activeLock(UUID.randomUUID(), now)).as("unknown account").isEmpty();
    }

    @Test
    void savingALoadedAccountNeverOverwritesTheCountAndAResetClearsIt() {
        UUID id = account();
        User stale = users.findById(id).orElseThrow();
        attempts.recordFailure(id, Instant.now());
        attempts.recordFailure(id, Instant.now());

        stale.recordLogin();
        tx().executeWithoutResult(status -> users.save(stale));
        assertThat(failures(id)).as("JPA does not write the lockout columns").isEqualTo(2);

        attempts.reset(id);
        assertThat(failures(id)).isZero();
        assertThat(jdbc.queryForObject("SELECT login_locked_until FROM users WHERE id = ?", Timestamp.class, id)).isNull();
    }

    @Test
    void theFifthFailureLocksNoticesOnceAndIsRecordedOutsideAnyTransaction() {
        UUID id = account();
        User loaded = users.findById(id).orElseThrow();
        for (int attempt = 1; attempt <= 5; attempt++) {
            assertThat(loginAttempts.failed(loaded).isPresent()).as("attempt " + attempt).isEqualTo(attempt == 5);
        }
        assertThat(loginAttempts.failed(loaded)).as("a sixth attempt finds the lock").isPresent();

        User locked = users.findById(id).orElseThrow();
        assertThat(locked.isLoginLockedAt(Instant.now().plusSeconds(890))).isTrue();
        assertThat(locked.isLoginLockedAt(Instant.now().plusSeconds(901))).isFalse();
        assertThat(locked.getFailedLoginAttempts()).isZero();
        verify(notices).loginLocked(any(User.class), any(Instant.class));
        assertThat(eventCount(id, "LOGIN_FAILED")).isEqualTo(5);
        assertThat(eventCount(id, "LOGIN_LOCKED")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT ip_address || '|' || length(user_agent) FROM security_events WHERE user_id = ? LIMIT 1",
                String.class, id)).isEqualTo("203.0.113.9|256");

        loginAttempts.unknownAccount();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM security_events WHERE user_id IS NULL AND event_type = 'LOGIN_FAILED'",
                Integer.class)).isPositive();
    }

    @Test
    void anEventIsStoredOnlyWhenItsActionCommitsAndAFailedStoreNeverFailsTheAction() {
        UUID id = account();
        assertThatThrownBy(() -> tx().executeWithoutResult(status -> {
            events.record(event(SecurityEventType.PASSWORD_CHANGED, id));
            throw new IllegalStateException("the action failed");
        })).isInstanceOf(IllegalStateException.class);
        assertThat(eventCount(id, "PASSWORD_CHANGED")).isZero();

        tx().executeWithoutResult(status -> events.record(event(SecurityEventType.PASSWORD_CHANGED, id)));
        assertThat(eventCount(id, "PASSWORD_CHANGED")).isEqualTo(1);

        jdbc.execute("ALTER TABLE security_events RENAME TO security_events_unavailable");
        try {
            assertThatCode(() -> tx().executeWithoutResult(status -> {
                jdbc.update("UPDATE users SET first_name = 'Changed' WHERE id = ?", id);
                events.record(event(SecurityEventType.EMAIL_CHANGED, id));
            })).doesNotThrowAnyException();
            assertThat(jdbc.queryForObject("SELECT first_name FROM users WHERE id = ?", String.class, id)).isEqualTo("Changed");
            SecurityEventRecorder recorder = new SecurityEventRecorder(events, origins);
            assertThatCode(() -> recorder.record(SecurityEventType.ROLE_CHANGED, id)).doesNotThrowAnyException();
        } finally {
            jdbc.execute("ALTER TABLE security_events_unavailable RENAME TO security_events");
        }
    }

    @Test
    void deletingTheAccountKeepsItsEventsWithoutTheLinkAndTheDeletionEventIsKeptToo() {
        UUID id = account();
        events.record(event(SecurityEventType.LOGIN_SUCCEEDED, id));
        tx().executeWithoutResult(status -> {
            users.deleteById(id);
            events.record(event(SecurityEventType.ACCOUNT_DELETED, id));
        });

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM security_events WHERE user_id = ?", Integer.class, id)).isZero();
        assertThat(jdbc.queryForObject("""
                SELECT COUNT(*) FROM security_events WHERE user_id IS NULL AND ip_address = '203.0.113.9'
                AND event_type IN ('LOGIN_SUCCEEDED', 'ACCOUNT_DELETED') AND created_at > now() - interval '1 minute'
                """, Integer.class)).isGreaterThanOrEqualTo(2);
    }

    @Test
    void thePurgeDeletesOnlyEventsOlderThanTheCutoffInBatches() {
        UUID id = account();
        Instant old = Instant.now().minusSeconds(200L * 24 * 3600);
        for (int index = 0; index < 3; index++) {
            jdbc.update("INSERT INTO security_events (user_id, event_type, created_at) VALUES (?, 'LOGIN_FAILED', ?)", id, Timestamp.from(old));
        }
        events.record(event(SecurityEventType.LOGIN_FAILED, id));
        Instant cutoff = Instant.now().minusSeconds(180L * 24 * 3600);

        assertThat(events.purgeBefore(cutoff, 2)).isEqualTo(2);
        assertThat(events.purgeBefore(cutoff, 2)).isGreaterThanOrEqualTo(1);
        assertThat(events.purgeBefore(cutoff, 2)).isZero();
        assertThat(eventCount(id, "LOGIN_FAILED")).isEqualTo(1);
    }

    @Test
    void parallelRefreshesOfOneTokenAreNotTheftButALateReplayEndsEverySession() throws Exception {
        UUID id = account();
        String raw = UUID.randomUUID().toString();
        String hash = RefreshTokenHasher.hash(raw);
        tx().executeWithoutResult(status -> tokens.save(id, hash, Instant.now().plusSeconds(600), 0));
        TokenService tokenService = mock(TokenService.class);
        when(tokenService.generateRefreshToken()).thenAnswer(call -> UUID.randomUUID().toString());
        when(tokenService.getRefreshTokenExpiration()).thenReturn(600_000L);
        AuthSessionResponseFactory factory = mock(AuthSessionResponseFactory.class);
        when(factory.create(any(), anyString())).thenAnswer(call -> new AuthSessionResponse("access", call.getArgument(1), "Bearer", 1000, null));
        var handler = new RefreshTokenCommandHandler(tokens, users, tokenService, factory, reuse);

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
        assertThat(sessionVersion(id)).as("losing a refresh race is not theft").isZero();
        assertThat(eventCount(id, "REFRESH_REUSE_DETECTED")).isZero();
        verify(pushDevices, never()).forgetUser(id);

        // The thief replays the rotated token later; the refresh fails and its transaction rolls back.
        jdbc.update("UPDATE refresh_tokens SET revoked_at = now() - interval '5 minutes' WHERE token_hash = ?", hash);
        assertThatThrownBy(() -> tx().execute(status -> handler.execute(new RefreshTokenCommand(raw))))
                .isInstanceOf(BusinessRuleViolationException.class).extracting("code").isEqualTo("INVALID_TOKEN");

        assertThat(sessionVersion(id)).as("every access and refresh token of the account ended").isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM refresh_tokens WHERE user_id = ? AND revoked_at IS NULL",
                Integer.class, id)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM refresh_tokens WHERE user_id = ? AND revoked_reason = 'reuse'",
                Integer.class, id)).isEqualTo(1);
        assertThat(eventCount(id, "REFRESH_REUSE_DETECTED")).isEqualTo(1);
        verify(pushDevices).forgetUser(id);
    }

    private SecurityEvent event(SecurityEventType type, UUID id) {
        return new SecurityEvent(type, id, "203.0.113.9", "Mozilla/5.0", Instant.now());
    }

    private int failures(UUID id) {
        return jdbc.queryForObject("SELECT failed_login_attempts FROM users WHERE id = ?", Integer.class, id);
    }

    private long sessionVersion(UUID id) {
        return jdbc.queryForObject("SELECT session_version FROM users WHERE id = ?", Long.class, id);
    }

    private int eventCount(UUID id, String type) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM security_events WHERE user_id = ? AND event_type = ?",
                Integer.class, id, type);
    }

    private TransactionTemplate tx() {
        return new TransactionTemplate(transactions);
    }

    private UUID account() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id, username, email, password, first_name, last_name, email_verified) "
                + "VALUES (?, ?, ?, 'old-hash', 'Test', 'User', true)", id, id.toString(), id + "@example.com");
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
            for (var result : pending) {
                result.get(15, TimeUnit.SECONDS);
            }
        }
    }
}
