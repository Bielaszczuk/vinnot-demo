package com.vinnot.payment.application.service;

import com.vinnot.payment.domain.model.ProviderPayment;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

/**
 * Bounded polling schedule for dispatched checkouts. While a checkout can still be paid it is polled every five
 * minutes; afterwards the delay grows with its age, and a settled attempt (or one past the horizon) is parked.
 * Parking is safe because signed webhooks and local registration/event changes wake the job again.
 */
final class ReconciliationSchedule {
    static final Duration ACTIVE_POLL = Duration.ofMinutes(5);
    static final Duration FAILURE_RETRY = Duration.ofMinutes(1);
    private static final Duration LATE_PAYMENT_GRACE = Duration.ofHours(1);
    private static final Duration HORIZON = Duration.ofDays(180);
    private static final Duration FIRST_DAY = Duration.ofDays(1);
    private static final Duration FIRST_DAY_POLL = Duration.ofMinutes(30);
    private static final Duration FIRST_WEEK = Duration.ofDays(7);
    private static final Duration FIRST_WEEK_POLL = Duration.ofHours(6);
    private static final Duration LATE_POLL = Duration.ofHours(24);

    private ReconciliationSchedule() {
    }

    /** No further provider-side change is expected for this payment unless the provider notifies one. */
    static boolean isFinal(ProviderPayment payment) {
        return payment.reversed() || payment.status() == ProviderPayment.Status.REJECTED
                || payment.status() == ProviderPayment.Status.CANCELLED;
    }

    /** @return the next check, or empty when the job should be parked until it is woken. */
    static Optional<Instant> afterSuccess(Instant expiresAt, boolean settled, Instant now) {
        Duration age = Duration.between(expiresAt, now);
        if (age.compareTo(LATE_PAYMENT_GRACE) < 0) {
            return Optional.of(now.plus(ACTIVE_POLL));
        }
        if (settled || age.compareTo(HORIZON) >= 0) {
            return Optional.empty();
        }
        return Optional.of(now.plus(backoff(age)));
    }

    /** A failure is never parked: it retries quickly only while the checkout is active. */
    static Instant afterFailure(Optional<Instant> expiresAt, Instant now) {
        return expiresAt.map(expiry -> Duration.between(expiry, now))
                .filter(age -> age.compareTo(LATE_PAYMENT_GRACE) >= 0)
                .map(age -> now.plus(backoff(age)))
                .orElse(now.plus(FAILURE_RETRY));
    }

    private static Duration backoff(Duration age) {
        if (age.compareTo(FIRST_DAY) < 0) {
            return FIRST_DAY_POLL;
        }
        if (age.compareTo(FIRST_WEEK) < 0) {
            return FIRST_WEEK_POLL;
        }
        return LATE_POLL;
    }
}
