package com.vinnot.shared.infrastructure.image;

import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Objects;

/** Shared raster limits inspected before any pixel buffer is allocated. */
public final class ImageResourceLimits {

    private static final long MAX_PIXELS = 24_000_000L;
    public static final int MAX_BYTES = 8 * 1024 * 1024;

    private ImageResourceLimits() {
    }

    public static boolean acceptsDimensions(int width, int height) {
        return width > 0 && height > 0 && (long) width * height <= MAX_PIXELS;
    }

    public static byte[] readBounded(InputStream content) throws IOException {
        byte[] bytes = content.readNBytes(MAX_BYTES + 1);
        if (bytes.length > MAX_BYTES) {
            throw new IllegalArgumentException("File size exceeds maximum allowed size of 8MB");
        }
        return bytes;
    }

    /** Reads only dimensions. Does not decode, re-encode or strip animation. */
    public static void validateDimensions(byte[] bytes) {
        if (Objects.isNull(bytes) || bytes.length == 0) {
            throw new IllegalArgumentException("Image is empty");
        }
        try (var input = new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw new IllegalArgumentException("Image header cannot be read");
            }
            var reader = readers.next();
            try {
                reader.setInput(input, true, true);
                if (!acceptsDimensions(reader.getWidth(0), reader.getHeight(0))) {
                    throw new IllegalArgumentException("Image exceeds the pixel limit");
                }
            } finally {
                reader.dispose();
            }
        } catch (IOException exception) {
            throw new IllegalArgumentException("Image header cannot be read");
        }
    }
}
