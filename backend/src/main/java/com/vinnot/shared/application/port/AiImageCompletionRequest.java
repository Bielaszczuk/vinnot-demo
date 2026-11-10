package com.vinnot.shared.application.port;

import java.time.Duration;
import java.util.Map;
import java.util.Objects;

/**
 * Provider-neutral request for structured extraction from one image.
 */
public record AiImageCompletionRequest(
        String prompt,
        byte[] imageBytes,
        String contentType,
        double temperature,
        int maxTokens,
        String schemaName,
        Map<String, Object> jsonSchema,
        ImageDetail detail,
        Duration timeout,
        int maxAttempts
) {

    public AiImageCompletionRequest {
        Objects.requireNonNull(prompt, "Prompt is required");
        imageBytes = Objects.requireNonNull(imageBytes, "Image bytes are required").clone();
        Objects.requireNonNull(contentType, "Content type is required");
        Objects.requireNonNull(schemaName, "Schema name is required");
        jsonSchema = Map.copyOf(Objects.requireNonNull(jsonSchema, "JSON schema is required"));
        detail = Objects.requireNonNull(detail, "Image detail is required");
        timeout = Objects.requireNonNull(timeout, "Timeout is required");
        if (timeout.isZero() || timeout.isNegative()) {
            throw new IllegalArgumentException("Timeout must be positive");
        }
        if (maxTokens <= 0) {
            throw new IllegalArgumentException("Max tokens must be positive");
        }
        if (maxAttempts <= 0) {
            throw new IllegalArgumentException("Max attempts must be positive");
        }
    }

    @Override
    public byte[] imageBytes() {
        return imageBytes.clone();
    }

    public enum ImageDetail {
        LOW,
        AUTO,
        HIGH
    }
}
