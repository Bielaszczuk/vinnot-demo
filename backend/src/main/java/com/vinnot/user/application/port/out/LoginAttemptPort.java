package com.vinnot.user.application.port.out;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Consecutive wrong passwords and the temporary sign-in lock of an account (#482). Each method is one atomic
 * statement that checks the lock itself, so parallel attempts never lose a count, never start a second lock and never
 * clear a running one, whatever account snapshot the caller loaded.
 */
public interface LoginAttemptPort {

    /**
     * Adds one wrong password and returns the new consecutive count. Returns 0 without counting while a lock runs at
     * {@code now}, or when the account no longer exists.
     */
    int recordFailure(UUID userId, Instant now);

    /**
     * Starts the lock until {@code lockedUntil} and clears the count, but only while the count is at least
     * {@code threshold} and no lock runs at {@code now}. Returns true for the one call that started it.
     */
    boolean startLock(UUID userId, int threshold, Instant now, Instant lockedUntil);

    /** The end of the lock that runs at {@code now}, if any. */
    Optional<Instant> activeLock(UUID userId, Instant now);

    /** Clears the count and an ended lock after a right password; a lock that still runs at {@code now} stays. */
    void clearFailures(UUID userId, Instant now);

    /** Clears the count and any lock, running or not: a password reset proves the owner. */
    void reset(UUID userId);
}
