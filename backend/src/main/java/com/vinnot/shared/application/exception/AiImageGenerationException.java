package com.vinnot.shared.application.exception;

/**
 * Failure of an AI image generation. Callers fall back to bundled artwork on every code; the code only
 * tells whether the provider was never called, produced an unusable image, or failed after its retries.
 */
public class AiImageGenerationException extends ExternalServiceUnavailableException {

    /** Images are disabled, in mock mode, or admission refused the call (budget, pause, capacity). */
    public static final String UNAVAILABLE = "AI_IMAGE_UNAVAILABLE";
    /** The provider returned an image that is not a usable PNG or lacks the requested transparency. */
    public static final String REJECTED = "AI_IMAGE_REJECTED";
    /** The provider call failed: error status, timeout, malformed body or exhausted retries. */
    public static final String FAILED = "AI_IMAGE_FAILED";

    private AiImageGenerationException(String code, String message, Throwable cause) {
        super(code, message, cause);
    }

    public static AiImageGenerationException unavailable(String message, Throwable cause) {
        return new AiImageGenerationException(UNAVAILABLE, message, cause);
    }

    public static AiImageGenerationException rejected(String message) {
        return new AiImageGenerationException(REJECTED, message, null);
    }

    public static AiImageGenerationException failed(String message, Throwable cause) {
        return new AiImageGenerationException(FAILED, message, cause);
    }
}
