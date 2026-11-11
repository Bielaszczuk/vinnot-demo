package com.vinnot.ai.application.config;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.Objects;

/** Operational limits independent from provider transports and billing APIs. */
public record AiProviderAdmissionPolicy(
        int maximumConcurrentRequests,
        Duration leaseDuration,
        BigDecimal monthlyLimitUsd,
        BigDecimal dailyLimitUsd,
        boolean paidCallsEnabled,
        Duration interactiveWait) {

    private static final Duration MAX_LEASE_DURATION = Duration.ofMinutes(5);
    private static final Duration DEFAULT_INTERACTIVE_WAIT = Duration.ofSeconds(4);
    private static final Duration MAX_INTERACTIVE_WAIT = Duration.ofSeconds(15);
    /** With this many slots or more, one is kept for interactive requests. */
    static final int MIN_SLOTS_FOR_RESERVATION = 3;

    public AiProviderAdmissionPolicy {
        Objects.requireNonNull(leaseDuration);
        Objects.requireNonNull(monthlyLimitUsd);
        Objects.requireNonNull(dailyLimitUsd);
        Objects.requireNonNull(interactiveWait);
        if (maximumConcurrentRequests < 1 || maximumConcurrentRequests > 20
                || leaseDuration.compareTo(Duration.ofMinutes(2)) < 0
                || leaseDuration.compareTo(MAX_LEASE_DURATION) > 0
                || monthlyLimitUsd.signum() <= 0 || dailyLimitUsd.signum() < 0
                || interactiveWait.isNegative() || interactiveWait.compareTo(MAX_INTERACTIVE_WAIT) > 0) {
            throw new IllegalArgumentException("Invalid AI admission limits");
        }
    }

    public AiProviderAdmissionPolicy(int maximumConcurrentRequests, Duration leaseDuration, BigDecimal monthlyLimitUsd,
            BigDecimal dailyLimitUsd, boolean paidCallsEnabled) {
        this(maximumConcurrentRequests, leaseDuration, monthlyLimitUsd, dailyLimitUsd, paidCallsEnabled,
                DEFAULT_INTERACTIVE_WAIT);
    }

    /** Slots background requests may use; the last one is kept for interactive requests when there are enough. */
    public int backgroundSlots() {
        return maximumConcurrentRequests >= MIN_SLOTS_FOR_RESERVATION
                ? maximumConcurrentRequests - 1 : maximumConcurrentRequests;
    }
}
