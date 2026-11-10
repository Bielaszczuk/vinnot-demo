package com.vinnot.shared.infrastructure.security;

import java.time.Duration;
import java.util.Objects;

public record RateLimitPolicy(
        String name,
        long capacity,
        long refillTokens,
        Duration refillPeriod
) {

    public RateLimitPolicy {
        if (Objects.isNull(name) || name.isBlank()) {
            throw new IllegalArgumentException("Rate-limit policy name is required");
        }
        if (capacity <= 0 || refillTokens <= 0) {
            throw new IllegalArgumentException("Rate-limit token values must be positive");
        }
        if (Objects.isNull(refillPeriod)
                || refillPeriod.isZero()
                || refillPeriod.isNegative()) {
            throw new IllegalArgumentException("Rate-limit refill period must be positive");
        }
    }
}
