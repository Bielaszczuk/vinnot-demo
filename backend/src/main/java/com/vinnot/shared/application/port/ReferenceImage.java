package com.vinnot.shared.application.port;

import java.util.Arrays;
import java.util.Objects;
import java.util.regex.Pattern;

/** One PNG style reference sent with an image edit; the name is a plain file name, never a path. */
public record ReferenceImage(String fileName, byte[] png) {

    private static final Pattern SAFE_FILE_NAME = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._-]{0,99}\\.png");
    private static final byte[] PNG_SIGNATURE = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'};

    public ReferenceImage {
        Objects.requireNonNull(fileName, "Reference file name is required");
        if (!SAFE_FILE_NAME.matcher(fileName).matches()) {
            throw new IllegalArgumentException("Reference file name must be a plain .png file name");
        }
        png = Objects.requireNonNull(png, "Reference image bytes are required").clone();
        if (png.length <= PNG_SIGNATURE.length
                || !Arrays.equals(Arrays.copyOf(png, PNG_SIGNATURE.length), PNG_SIGNATURE)) {
            throw new IllegalArgumentException("Reference image must be a PNG");
        }
    }

    @Override
    public byte[] png() {
        return png.clone();
    }

    /** Size without copying the bytes. */
    public int size() {
        return png.length;
    }
}
