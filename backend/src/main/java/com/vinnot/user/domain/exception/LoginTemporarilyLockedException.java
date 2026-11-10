package com.vinnot.user.domain.exception;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

/**
 * Password sign-in is blocked until {@link #lockedUntil()} after too many wrong passwords (#482). It never says
 * whether the password of the rejected attempt was right.
 */
public class LoginTemporarilyLockedException extends BusinessRuleViolationException {
    public static final String CODE = "ACCOUNT_TEMPORARILY_LOCKED";

    private final Instant lockedUntil;

    public LoginTemporarilyLockedException(Instant lockedUntil) {
        super(CODE, "Too many failed sign-in attempts. Try again later");
        this.lockedUntil = Objects.requireNonNull(lockedUntil, "lockedUntil");
    }

    public Instant lockedUntil() {
        return lockedUntil;
    }

    /** Whole seconds left, rounded up and at least one, for the {@code Retry-After} header. */
    public long retryAfterSeconds(Instant now) {
        Duration left = Duration.between(now, lockedUntil);
        if (left.isNegative() || left.isZero()) {
            return 1;
        }
        long seconds = left.getSeconds();
        return left.getNano() > 0 ? seconds + 1 : seconds;
    }
}
