package com.vinnot.shared.application.port;

import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * Provider-neutral request to paint a new image in the style of the reference images.
 *
 * @param size                  output size; {@code null} uses the configured default
 * @param transparentBackground when true the result must have a real transparent background
 */
public record ImageEditRequest(String prompt, List<ReferenceImage> references, String size,
        boolean transparentBackground) {

    public static final int MAX_PROMPT_LENGTH = 32_000;
    public static final int MAX_REFERENCES = 16;
    public static final long MAX_TOTAL_REFERENCE_BYTES = 20L * 1024 * 1024;
    public static final Set<String> SUPPORTED_SIZES = Set.of("1024x1024", "1024x1536", "1536x1024", "auto");

    public ImageEditRequest {
        Objects.requireNonNull(prompt, "Prompt is required");
        if (prompt.isBlank() || prompt.length() > MAX_PROMPT_LENGTH) {
            throw new IllegalArgumentException("Prompt must be non-blank and at most "
                    + MAX_PROMPT_LENGTH + " characters");
        }
        references = List.copyOf(Objects.requireNonNull(references, "References are required"));
        if (references.isEmpty() || references.size() > MAX_REFERENCES) {
            throw new IllegalArgumentException("Between 1 and " + MAX_REFERENCES + " references are required");
        }
        long totalBytes = references.stream().mapToLong(ReferenceImage::size).sum();
        if (totalBytes > MAX_TOTAL_REFERENCE_BYTES) {
            throw new IllegalArgumentException("References exceed the total byte limit");
        }
        if (Objects.nonNull(size) && !SUPPORTED_SIZES.contains(size)) {
            throw new IllegalArgumentException("Unsupported image size");
        }
    }
}
