package com.vinnot.user.application.service;

import com.vinnot.user.application.port.out.PasswordHashingPort;
import com.vinnot.user.domain.exception.LoginTemporarilyLockedException;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class LoginAttemptGuardTest {
    private static final Instant NOW = Instant.parse("2026-10-29T12:00:00Z");
    private final PasswordHashingPort passwords = mock(PasswordHashingPort.class);
    private final LoginAttemptRecorder attempts = mock(LoginAttemptRecorder.class);
    private final LoginAttemptGuard guard = new LoginAttemptGuard(passwords, attempts, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void anUnknownAccountStillSpendsOneHashComparisonAndIsRecorded() {
        guard.rejectUnknownAccount("guess");
        guard.rejectUnknownAccount(null);

        verify(passwords).matches("guess", LoginAttemptGuard.DUMMY_PASSWORD_HASH);
        verify(passwords).matches("", LoginAttemptGuard.DUMMY_PASSWORD_HASH);
        assertThat(LoginAttemptGuard.DUMMY_PASSWORD_HASH).startsWith("$2a$10$").hasSize(60);
        verify(attempts, times(2)).unknownAccount();
    }

    @Test
    void aRightPasswordPassesAndClearsEarlierFailures() {
        User user = user(2, null);
        when(passwords.matches("right", "hash")).thenReturn(true);
        when(attempts.succeeded(user)).thenReturn(Optional.empty());

        assertThat(guard.passwordMatches(user, "right")).isTrue();

        verify(attempts).succeeded(user);
        verify(attempts, never()).failed(any());
    }

    @Test
    void aRightPasswordIsRefusedWhenTheLockStartedAfterTheAccountWasLoaded() {
        User stale = user(4, null);
        when(passwords.matches("right", "hash")).thenReturn(true);
        when(attempts.succeeded(stale)).thenReturn(Optional.of(NOW.plusSeconds(900)));

        assertThatThrownBy(() -> guard.passwordMatches(stale, "right"))
                .isInstanceOfSatisfying(LoginTemporarilyLockedException.class,
                        locked -> assertThat(locked.lockedUntil()).isEqualTo(NOW.plusSeconds(900)));
    }

    @Test
    void aWrongPasswordBelowTheLimitIsCountedAndReportedAsWrong() {
        User user = user(0, null);
        when(attempts.failed(user)).thenReturn(Optional.empty());

        assertThat(guard.passwordMatches(user, "wrong")).isFalse();

        verify(attempts).failed(user);
        verify(attempts, never()).succeeded(any());
    }

    @Test
    void theFailureThatStartsTheLockAnswersWithTheLock() {
        User user = user(4, null);
        when(attempts.failed(user)).thenReturn(Optional.of(NOW.plusSeconds(900)));

        assertThatThrownBy(() -> guard.passwordMatches(user, "wrong"))
                .isInstanceOf(LoginTemporarilyLockedException.class)
                .extracting("code").isEqualTo("ACCOUNT_TEMPORARILY_LOCKED");
    }

    @Test
    void whileLockedEvenTheRightPasswordIsRejectedWithoutBeingChecked() {
        User user = user(0, NOW.plusSeconds(60));

        assertThatThrownBy(() -> guard.passwordMatches(user, "right"))
                .isInstanceOfSatisfying(LoginTemporarilyLockedException.class,
                        locked -> assertThat(locked.lockedUntil()).isEqualTo(NOW.plusSeconds(60)));

        verify(passwords, never()).matches(anyString(), anyString());
        verifyNoInteractions(attempts);
    }

    @Test
    void anExpiredLockNoLongerBlocks() {
        User user = user(0, Instant.now().minusSeconds(5));
        when(passwords.matches("right", "hash")).thenReturn(true);
        when(attempts.succeeded(user)).thenReturn(Optional.empty());

        assertThat(new LoginAttemptGuard(passwords, attempts).passwordMatches(user, "right")).isTrue();
    }

    private static User user(int failures, Instant lockedUntil) {
        return User.builder().id(UUID.randomUUID()).email(Email.of("ana@vinnot.com")).password(Password.fromHash("hash"))
                .username("ana").firstName("Ana").lastName("Paz").emailVerified(true)
                .failedLoginAttempts(failures).loginLockedUntil(lockedUntil).build();
    }
}
