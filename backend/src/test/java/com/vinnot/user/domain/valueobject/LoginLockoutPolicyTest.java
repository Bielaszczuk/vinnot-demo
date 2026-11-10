package com.vinnot.user.domain.valueobject;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LoginLockoutPolicyTest {

    @Test
    void theDefaultsLockForFifteenMinutesAfterFiveConsecutiveFailures() {
        LoginLockoutPolicy policy = LoginLockoutPolicy.defaults();
        Instant now = Instant.parse("2026-10-29T12:00:00Z");

        assertThat(policy.maxFailures()).isEqualTo(5);
        assertThat(policy.locksAfter(4)).isFalse();
        assertThat(policy.locksAfter(5)).isTrue();
        assertThat(policy.locksAfter(6)).isTrue();
        assertThat(policy.lockedUntil(now)).isEqualTo(Instant.parse("2026-10-29T12:15:00Z"));
    }

    @Test
    void rejectsSettingsThatWouldNeverOrAlwaysLock() {
        assertThatThrownBy(() -> new LoginLockoutPolicy(0, Duration.ofMinutes(15)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("max-failures");
        assertThatThrownBy(() -> new LoginLockoutPolicy(5, Duration.ZERO))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("lock-duration");
        assertThatThrownBy(() -> new LoginLockoutPolicy(5, Duration.ofSeconds(-1)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("lock-duration");
        assertThatThrownBy(() -> new LoginLockoutPolicy(5, null))
                .isInstanceOf(NullPointerException.class).hasMessageContaining("lock-duration");
    }
}
