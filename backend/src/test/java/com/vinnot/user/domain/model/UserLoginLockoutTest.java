package com.vinnot.user.domain.model;

import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class UserLoginLockoutTest {
    private static final Instant NOW = Instant.parse("2026-10-29T12:00:00Z");

    @Test
    void aNewAccountHasNoFailuresAndNoTemporaryLock() {
        User user = User.create("ana", Email.of("ana@vinnot.com"), Password.fromHash("hash"), "Ana", "Paz");

        assertThat(user.getFailedLoginAttempts()).isZero();
        assertThat(user.getLoginLockedUntil()).isNull();
        assertThat(user.isLoginLockedAt(NOW)).isFalse();
        assertThat(user.hasLoginFailures()).isFalse();
    }

    @Test
    void theTemporaryLockHoldsOnlyUntilItsEndAndIsNotTheAdministrativeLock() {
        User locked = restored(0, NOW.plusSeconds(60));

        assertThat(locked.isLoginLockedAt(NOW)).isTrue();
        assertThat(locked.isLoginLockedAt(NOW.plusSeconds(60))).isFalse();
        assertThat(locked.isLocked()).as("administrative suspension").isFalse();
        assertThat(locked.hasLoginFailures()).as("an old lock is still cleared by a right password").isTrue();
    }

    @Test
    void failuresAloneAlsoNeedClearing() {
        User user = restored(3, null);

        assertThat(user.getFailedLoginAttempts()).isEqualTo(3);
        assertThat(user.isLoginLockedAt(NOW)).isFalse();
        assertThat(user.hasLoginFailures()).isTrue();
    }

    @Test
    void endingAllSessionsInvalidatesEveryIssuedToken() {
        User user = restored(0, null);
        long before = user.getSessionVersion();

        user.endAllSessions();

        assertThat(user.getSessionVersion()).isEqualTo(before + 1);
        assertThat(user.getUpdatedAt()).isNotNull();
    }

    private static User restored(int failures, Instant lockedUntil) {
        return User.builder().id(UUID.randomUUID()).email(Email.of("ana@vinnot.com")).password(Password.fromHash("hash"))
                .username("ana").firstName("Ana").lastName("Paz")
                .failedLoginAttempts(failures).loginLockedUntil(lockedUntil).build();
    }
}
