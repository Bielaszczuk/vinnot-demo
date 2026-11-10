package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.exception.SocialPublishingException;
import com.vinnot.marketing.application.exception.SocialPublishingException.Code;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Supplier;

/**
 * Waits for a network to finish processing (#510): checks right away, then every interval, and once more at the
 * deadline before giving up with a retryable {@code PROCESSING_TIMEOUT}. Meta advises checking about once a minute for
 * at most five minutes. Stateless and thread-safe.
 */
final class StatusPoller {

    /** Pauses the calling thread; tests advance a clock instead. */
    @FunctionalInterface
    interface Sleeper {
        void sleep(Duration duration) throws InterruptedException;
    }

    private final Clock clock;
    private final Sleeper sleeper;
    private final Duration interval;
    private final Duration timeout;

    StatusPoller(Clock clock, Sleeper sleeper, Duration interval, Duration timeout) {
        this.clock = Objects.requireNonNull(clock, "clock");
        this.sleeper = Objects.requireNonNull(sleeper, "sleeper");
        if (interval.toMillis() < 1 || interval.compareTo(timeout) > 0) {
            throw new IllegalArgumentException("Poll interval must be positive and within the poll timeout");
        }
        this.interval = interval;
        this.timeout = timeout;
    }

    /** Returns the first non-empty check; a check may also throw to stop waiting. */
    <T> T await(Supplier<Optional<T>> check, String what) {
        Instant deadline = clock.instant().plus(timeout);
        while (true) {
            Optional<T> done = check.get();
            if (done.isPresent()) {
                return done.get();
            }
            Duration remaining = Duration.between(clock.instant(), deadline);
            if (remaining.isZero() || remaining.isNegative()) {
                throw new SocialPublishingException(Code.PROCESSING_TIMEOUT,
                        what + " still processing after " + timeout.toSeconds() + " s");
            }
            try {
                sleeper.sleep(remaining.compareTo(interval) < 0 ? remaining : interval);
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                throw new SocialPublishingException(Code.UNAVAILABLE, "interrupted while waiting for " + what,
                        interrupted);
            }
        }
    }
}
