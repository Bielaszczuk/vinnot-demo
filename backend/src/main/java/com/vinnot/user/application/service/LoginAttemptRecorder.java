package com.vinnot.user.application.service;

import com.vinnot.user.application.port.out.LoginAttemptPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.LoginLockoutPolicy;
import com.vinnot.user.domain.valueobject.SecurityEventType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.Optional;

/**
 * Counts password checks for the temporary sign-in lockout (#482). It runs outside any transaction: each count is one
 * auto-committed statement, the lock and its notice commit together in {@link LoginLockStarter}, and the security
 * events are written directly. A sign-in therefore holds at most one database connection at a time, and never while
 * it hashes a password.
 */
@Service
public class LoginAttemptRecorder {
    private final LoginAttemptPort attempts;
    private final LoginLockoutPolicy policy;
    private final LoginLockStarter locks;
    private final SecurityEventRecorder events;
    private final Clock clock;

    @Autowired
    public LoginAttemptRecorder(LoginAttemptPort attempts, LoginLockoutPolicy policy, LoginLockStarter locks,
            SecurityEventRecorder events) {
        this(attempts, policy, locks, events, Clock.systemUTC());
    }

    LoginAttemptRecorder(LoginAttemptPort attempts, LoginLockoutPolicy policy, LoginLockStarter locks,
            SecurityEventRecorder events, Clock clock) {
        this.attempts = attempts;
        this.policy = policy;
        this.locks = locks;
        this.events = events;
        this.clock = clock;
    }

    /**
     * Counts one wrong password. Returns the end of the lock when the account is locked after this attempt: because it
     * started the lock (the only case that notices the owner and records LOGIN_LOCKED), or because a parallel attempt
     * did. A failure while a lock runs is refused without being counted or recorded.
     */
    public Optional<Instant> failed(User user) {
        Instant now = clock.instant();
        int failures = attempts.recordFailure(user.getId(), now);
        if (failures == 0) {
            return attempts.activeLock(user.getId(), now);
        }
        events.record(SecurityEventType.LOGIN_FAILED, user.getId());
        if (!policy.locksAfter(failures)) {
            return Optional.empty();
        }
        Instant lockedUntil = policy.lockedUntil(now);
        if (!locks.start(user, policy.maxFailures(), now, lockedUntil)) {
            return attempts.activeLock(user.getId(), now);
        }
        events.record(SecurityEventType.LOGIN_LOCKED, user.getId());
        return Optional.of(lockedUntil);
    }

    /**
     * A right password clears the count, even when a later check (unverified email, suspension) refuses the sign-in.
     * Returns the end of a lock that started after the account was loaded: that lock stays and the sign-in is refused.
     */
    public Optional<Instant> succeeded(User user) {
        Instant now = clock.instant();
        Optional<Instant> lock = attempts.activeLock(user.getId(), now);
        if (lock.isEmpty()) {
            attempts.clearFailures(user.getId(), now);
        }
        return lock;
    }

    /** No account has that email or username: nothing to count, but the attempt is still recorded. */
    public void unknownAccount() {
        events.record(SecurityEventType.LOGIN_FAILED, null);
    }
}
