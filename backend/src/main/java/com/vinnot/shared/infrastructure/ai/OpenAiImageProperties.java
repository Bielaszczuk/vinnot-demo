package com.vinnot.shared.infrastructure.ai;

import com.vinnot.shared.application.port.ImageEditRequest;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.Objects;
import java.util.Set;

/**
 * Paid image generation settings. Images are priced flat: every attempt reserves {@code maxCostUsd} against the
 * shared AI spending caps and settles it when the provider bills the call.
 */
@ConfigurationProperties(prefix = "ai.images")
public record OpenAiImageProperties(
        Boolean enabled,
        String model,
        String quality,
        String size,
        BigDecimal maxCostUsd,
        Duration timeout,
        Integer maxAttempts,
        Long initialBackoffMs
) {

    /** Stays below the two-minute minimum admission lease, so a permit never outlives its capacity slot. */
    static final Duration MAX_TIMEOUT = Duration.ofSeconds(115);
    static final Duration DEFAULT_TIMEOUT = Duration.ofSeconds(110);
    static final BigDecimal MAX_COST_PER_IMAGE_USD = new BigDecimal("5");
    static final int MAX_ATTEMPTS = 3;
    private static final Set<String> QUALITIES = Set.of("low", "medium", "high", "auto");

    public OpenAiImageProperties {
        enabled = Objects.requireNonNullElse(enabled, false);
        model = Objects.requireNonNullElse(model, "gpt-image-1");
        quality = Objects.requireNonNullElse(quality, "medium");
        size = Objects.requireNonNullElse(size, "1024x1536");
        maxCostUsd = Objects.requireNonNullElse(maxCostUsd, new BigDecimal("0.25"));
        timeout = Objects.requireNonNullElse(timeout, DEFAULT_TIMEOUT);
        maxAttempts = Objects.requireNonNullElse(maxAttempts, 2);
        initialBackoffMs = Objects.requireNonNullElse(initialBackoffMs, 500L);
        if (model.isBlank() || !QUALITIES.contains(quality) || !ImageEditRequest.SUPPORTED_SIZES.contains(size)) {
            throw new IllegalArgumentException("Invalid AI image model, quality or size");
        }
        if (maxCostUsd.signum() <= 0 || maxCostUsd.compareTo(MAX_COST_PER_IMAGE_USD) > 0) {
            throw new IllegalArgumentException("AI image maximum cost must be positive and at most USD 5");
        }
        if (timeout.toMillis() < 1 || timeout.compareTo(MAX_TIMEOUT) > 0) {
            throw new IllegalArgumentException("AI image timeout must be between 1 millisecond and 115 seconds");
        }
        if (maxAttempts < 1 || maxAttempts > MAX_ATTEMPTS || initialBackoffMs < 0) {
            throw new IllegalArgumentException("AI image attempts must be 1-3 with a non-negative backoff");
        }
    }
}
