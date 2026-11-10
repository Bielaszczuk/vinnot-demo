package com.vinnot.shared.application.port;

import java.util.Objects;

/** A validated PNG produced by an image provider, with the model that painted it. */
public record GeneratedImage(byte[] png, String model) {

    public GeneratedImage {
        png = Objects.requireNonNull(png, "Image bytes are required").clone();
        Objects.requireNonNull(model, "Model is required");
        if (png.length == 0 || model.isBlank()) {
            throw new IllegalArgumentException("Generated image and model must not be empty");
        }
    }

    @Override
    public byte[] png() {
        return png.clone();
    }
}
