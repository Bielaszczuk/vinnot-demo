package com.vinnot.shared.application.port;

import com.vinnot.shared.application.exception.AiImageGenerationException;

/** Paid image generation; every call is admitted against the shared AI spending caps. */
public interface AiImageService {

    /** False when images are disabled, no provider key is configured, or the provider is the mock. */
    boolean isAvailable();

    /** Simulation is explicit: in mock mode no provider call is ever made and callers use fallbacks. */
    boolean isMockMode();

    /**
     * Paints one image in the style of the references.
     *
     * @throws AiImageGenerationException on every failure; {@link AiImageGenerationException#REJECTED}
     *         when the result is unusable (for example opaque when transparency was requested)
     */
    GeneratedImage edit(ImageEditRequest request);
}
