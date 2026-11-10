package com.vinnot.wine.infrastructure.config;

import com.vinnot.shared.application.port.AiImageCompletionRequest.ImageDetail;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.util.Objects;

/**
 * Latency and fidelity controls for the optional visual fallback.
 */
@ConfigurationProperties(prefix = "app.wine-label.recognition")
public record WineLabelRecognitionProperties(
        Duration timeout,
        ImageDetail detail,
        Integer maxTokens,
        Integer maxAttempts
) {

    private static final Duration DEFAULT_TIMEOUT = Duration.ofSeconds(12);
    private static final int DEFAULT_MAX_TOKENS = 500;
    private static final int DEFAULT_MAX_ATTEMPTS = 1;

    public WineLabelRecognitionProperties {
        timeout = Objects.isNull(timeout) ? DEFAULT_TIMEOUT : timeout;
        detail = Objects.isNull(detail) ? ImageDetail.HIGH : detail;
        maxTokens = Objects.isNull(maxTokens) ? DEFAULT_MAX_TOKENS : maxTokens;
        maxAttempts = Objects.isNull(maxAttempts)
                ? DEFAULT_MAX_ATTEMPTS : maxAttempts;
        if (timeout.isZero() || timeout.isNegative()) {
            throw new IllegalArgumentException("Recognition timeout must be positive");
        }
        if (maxTokens <= 0 || maxAttempts <= 0) {
            throw new IllegalArgumentException(
                    "Recognition token and attempt limits must be positive");
        }
    }
}
