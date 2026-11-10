package com.vinnot.user.domain.valueobject;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

/**
 * Temporary sign-in lockout (#482): after {@code maxFailures} consecutive wrong passwords the account cannot sign in
 * with a password for {@code lockDuration}. It is separate from the administrative suspension ({@code users.locked}).
 */
public record LoginLockoutPolicy(int maxFailures, Duration lockDuration) {
    public static final int DEFAULT_MAX_FAILURES = 5;
    public static final Duration DEFAULT_LOCK_DURATION = Duration.ofMinutes(15);

    public LoginLockoutPolicy {
        if (maxFailures < 1) {
            throw new IllegalArgumentException("app.security.login-lockout.max-failures must be positive");
        }
        Objects.requireNonNull(lockDuration, "app.security.login-lockout.lock-duration is required");
        if (lockDuration.isNegative() || lockDuration.isZero()) {
            throw new IllegalArgumentException("app.security.login-lockout.lock-duration must be positive");
        }
    }

    public static LoginLockoutPolicy defaults() {
        return new LoginLockoutPolicy(DEFAULT_MAX_FAILURES, DEFAULT_LOCK_DURATION);
    }

    /** Whether this many consecutive failures start a lock. */
    public boolean locksAfter(int consecutiveFailures) {
        return consecutiveFailures >= maxFailures;
    }

    public Instant lockedUntil(Instant now) {
        return now.plus(lockDuration);
    }
}
