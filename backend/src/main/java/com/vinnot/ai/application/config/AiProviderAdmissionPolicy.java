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
        boolean paidCallsEnabled) {

    private static final Duration MAX_LEASE_DURATION = Duration.ofMinutes(5);

    public AiProviderAdmissionPolicy {
        Objects.requireNonNull(leaseDuration);
        Objects.requireNonNull(monthlyLimitUsd);
        Objects.requireNonNull(dailyLimitUsd);
        if (maximumConcurrentRequests < 1 || maximumConcurrentRequests > 20
                || leaseDuration.compareTo(Duration.ofMinutes(2)) < 0
                || leaseDuration.compareTo(MAX_LEASE_DURATION) > 0
                || monthlyLimitUsd.signum() <= 0 || dailyLimitUsd.signum() < 0) {
            throw new IllegalArgumentException("Invalid AI admission limits");
        }
    }
}
