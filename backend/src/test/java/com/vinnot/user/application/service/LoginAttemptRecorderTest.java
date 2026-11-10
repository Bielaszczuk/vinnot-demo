package com.vinnot.user.application.service;

import com.vinnot.user.application.port.out.LoginAttemptPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.LoginLockoutPolicy;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.domain.valueobject.SecurityEventType;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class LoginAttemptRecorderTest {
    private static final Instant NOW = Instant.parse("2026-10-29T12:00:00Z");
    private static final Instant UNTIL = NOW.plus(Duration.ofMinutes(15));
    private final LoginAttemptPort attempts = mock(LoginAttemptPort.class);
    private final LoginLockStarter locks = mock(LoginLockStarter.class);
    private final SecurityEventRecorder events = mock(SecurityEventRecorder.class);
    private final LoginAttemptRecorder recorder = new LoginAttemptRecorder(
            attempts, LoginLockoutPolicy.defaults(), locks, events, Clock.fixed(NOW, ZoneOffset.UTC));
    private final User user = User.create("ana", Email.of("ana@vinnot.com"), Password.fromHash("hash"), "Ana", "Paz");

    @Test
    void aFailureBelowTheLimitIsCountedAndRecordedWithoutLocking() {
        when(attempts.recordFailure(user.getId(), NOW)).thenReturn(4);

        assertThat(recorder.failed(user)).isEmpty();

        verify(events).record(SecurityEventType.LOGIN_FAILED, user.getId());
        verifyNoInteractions(locks);
    }

    @Test
    void theFifthConsecutiveFailureLocksForFifteenMinutesAndRecordsIt() {
        when(attempts.recordFailure(user.getId(), NOW)).thenReturn(5);
        when(locks.start(user, 5, NOW, UNTIL)).thenReturn(true);

        assertThat(recorder.failed(user)).contains(UNTIL);

        verify(events).record(SecurityEventType.LOGIN_FAILED, user.getId());
        verify(events).record(SecurityEventType.LOGIN_LOCKED, user.getId());
    }

    @Test
    void aParallelFailureThatFindsTheLockStartedAnswersWithItButStartsNoOther() {
        when(attempts.recordFailure(user.getId(), NOW)).thenReturn(6);
        when(locks.start(user, 5, NOW, UNTIL)).thenReturn(false);
        when(attempts.activeLock(user.getId(), NOW)).thenReturn(Optional.of(UNTIL));

        assertThat(recorder.failed(user)).contains(UNTIL);

        verify(events, never()).record(SecurityEventType.LOGIN_LOCKED, user.getId());
    }

    @Test
    void aFailureDuringTheLockIsNeitherCountedNorRecorded() {
        when(attempts.recordFailure(user.getId(), NOW)).thenReturn(0);
        when(attempts.activeLock(user.getId(), NOW)).thenReturn(Optional.of(UNTIL));

        assertThat(recorder.failed(user)).contains(UNTIL);

        verifyNoInteractions(events, locks);
    }

    @Test
    void aRightPasswordClearsTheCountUnlessALockIsRunning() {
        when(attempts.activeLock(user.getId(), NOW)).thenReturn(Optional.empty());
        assertThat(recorder.succeeded(user)).isEmpty();
        verify(attempts).clearFailures(user.getId(), NOW);

        User locked = User.create("bea", Email.of("bea@vinnot.com"), Password.fromHash("hash"), "Bea", "Paz");
        when(attempts.activeLock(locked.getId(), NOW)).thenReturn(Optional.of(UNTIL));
        assertThat(recorder.succeeded(locked)).contains(UNTIL);
        verify(attempts, never()).clearFailures(locked.getId(), NOW);
    }

    @Test
    void anUnknownAccountIsRecordedWithoutAUser() {
        recorder.unknownAccount();

        verify(events).record(SecurityEventType.LOGIN_FAILED, null);
        verifyNoInteractions(attempts, locks);
    }

    @Test
    void theProductionConstructorUsesTheSystemClock() {
        when(attempts.recordFailure(any(), any())).thenReturn(5);
        when(locks.start(any(), any(Integer.class), any(), any())).thenReturn(true);

        assertThat(new LoginAttemptRecorder(attempts, LoginLockoutPolicy.defaults(), locks, events).failed(user)).isPresent();
    }
}
