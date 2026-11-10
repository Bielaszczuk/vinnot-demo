package com.vinnot.notification.infrastructure.push;

import java.time.Duration;
import java.util.function.LongSupplier;

/**
 * Token bucket shared by every push sender of this instance, one permit per device message. The bucket holds one
 * second of messages, so a quiet sender may burst; past that each caller reserves its permits at once (the balance may
 * go negative) and sleeps outside the lock until they are paid back, which keeps callers in arrival order.
 */
public final class PushRateLimiter {
    private static final double NANOS_PER_SECOND = 1_000_000_000d;
    private final double perSecond;
    private final LongSupplier nanoTime;
    private final Pause pause;
    private double available;
    private long refilledAt;

    public PushRateLimiter(double perSecond, LongSupplier nanoTime, Pause pause) {
        if (!(perSecond > 0)) {
            throw new IllegalArgumentException("The push rate limit must be positive");
        }
        this.perSecond = perSecond;
        this.nanoTime = nanoTime;
        this.pause = pause;
        this.available = perSecond;
        this.refilledAt = nanoTime.getAsLong();
    }

    /** A limiter that never waits (tests and the log provider). */
    public static PushRateLimiter unlimited() {
        return new PushRateLimiter(Double.MAX_VALUE, () -> 0L, duration -> { });
    }

    /** Waits until {@code permits} messages may be sent. */
    public void acquire(int permits) {
        long waitNanos = reserve(permits);
        if (waitNanos <= 0) {
            return;
        }
        try {
            pause.sleep(Duration.ofNanos(waitNanos));
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while waiting for the push rate limit", interrupted);
        }
    }

    private synchronized long reserve(int permits) {
        long now = nanoTime.getAsLong();
        available = Math.min(perSecond, available + (now - refilledAt) / NANOS_PER_SECOND * perSecond);
        refilledAt = now;
        available -= permits;
        return available >= 0 ? 0 : Math.round(-available / perSecond * NANOS_PER_SECOND);
    }
}
