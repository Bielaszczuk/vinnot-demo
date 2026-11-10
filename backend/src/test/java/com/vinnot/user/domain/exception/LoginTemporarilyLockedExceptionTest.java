package com.vinnot.user.domain.exception;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class LoginTemporarilyLockedExceptionTest {
    private static final Instant NOW = Instant.parse("2026-10-29T12:00:00Z");

    @Test
    void carriesItsCodeAndAMessageThatSaysNothingAboutThePassword() {
        var exception = new LoginTemporarilyLockedException(NOW.plusSeconds(900));

        assertThat(exception.getCode()).isEqualTo("ACCOUNT_TEMPORARILY_LOCKED");
        assertThat(exception.getMessage()).isEqualTo("Too many failed sign-in attempts. Try again later");
        assertThat(exception.lockedUntil()).isEqualTo(NOW.plusSeconds(900));
    }

    @Test
    void retryAfterRoundsUpToWholeSecondsAndIsNeverBelowOne() {
        assertThat(new LoginTemporarilyLockedException(NOW.plusSeconds(900)).retryAfterSeconds(NOW)).isEqualTo(900);
        assertThat(new LoginTemporarilyLockedException(NOW.plusMillis(1500)).retryAfterSeconds(NOW)).isEqualTo(2);
        assertThat(new LoginTemporarilyLockedException(NOW.plusMillis(1)).retryAfterSeconds(NOW)).isEqualTo(1);
        assertThat(new LoginTemporarilyLockedException(NOW).retryAfterSeconds(NOW)).isEqualTo(1);
        assertThat(new LoginTemporarilyLockedException(NOW.minusSeconds(5)).retryAfterSeconds(NOW)).isEqualTo(1);
    }
}
