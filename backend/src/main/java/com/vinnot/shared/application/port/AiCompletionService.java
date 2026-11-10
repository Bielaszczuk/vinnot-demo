package com.vinnot.shared.application.port;

import java.util.Map;

public interface AiCompletionService {

    /**
     * Indicates whether this provider is configured and available for use.
     */
    boolean isAvailable();

    /** Simulation is explicit; unavailable real providers must never imply mock mode. */
    default boolean isMockMode() { return false; }

    default String configurationId() { return "provider"; }

    /**
     * Sends a prompt and returns parsed JSON response.
     *
     * @param prompt      the prompt to send
     * @param temperature the temperature for generation
     * @param maxTokens   the maximum tokens for response
     * @return parsed JSON as a Map
     */
    Map<String, Object> chatCompletion(String prompt, double temperature, int maxTokens);

    /**
     * Sends a prompt with an image and returns parsed JSON response.
     *
     * @param prompt      the text prompt
     * @param imageBytes  the image data
     * @param contentType the image MIME type
     * @param temperature the temperature for generation
     * @param maxTokens   the maximum tokens for response
     * @return parsed JSON as a Map
     */
    Map<String, Object> structuredCompletionWithImage(AiImageCompletionRequest request);
}
