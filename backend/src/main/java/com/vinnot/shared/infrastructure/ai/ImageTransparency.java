package com.vinnot.shared.infrastructure.ai;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Objects;

/**
 * Checks a provider PNG before use: it must decode as a bounded PNG and, when transparency was requested,
 * really have a transparent background (an alpha channel, transparent corners and a mostly transparent border),
 * so a painted white box never reaches a slide.
 */
public final class ImageTransparency {

    /** Alpha at or below this value (0-255) counts as transparent. */
    static final int MAX_TRANSPARENT_ALPHA = 16;
    /** Share of sampled border pixels that must be transparent; the subject may touch the edge. */
    static final double MIN_TRANSPARENT_BORDER_SHARE = 0.9;
    static final long MAX_PIXELS = 4096L * 4096L;
    private static final int SAMPLES_PER_EDGE = 64;
    private static final int ALPHA_SHIFT = 24;

    public enum Verdict {
        USABLE, NOT_PNG, TOO_LARGE, OPAQUE
    }

    private ImageTransparency() {
    }

    public static Verdict inspect(byte[] png, boolean requireTransparency) {
        BufferedImage image;
        try {
            image = decode(Objects.requireNonNull(png));
        } catch (IOException | RuntimeException invalid) {
            return Verdict.NOT_PNG;
        } catch (TooLargeException tooLarge) {
            return Verdict.TOO_LARGE;
        }
        if (Objects.isNull(image)) {
            return Verdict.NOT_PNG;
        }
        if (!requireTransparency) {
            return Verdict.USABLE;
        }
        return image.getColorModel().hasAlpha() && cornersTransparent(image) && borderTransparent(image)
                ? Verdict.USABLE : Verdict.OPAQUE;
    }

    private static BufferedImage decode(byte[] png) throws IOException, TooLargeException {
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(png))) {
            if (Objects.isNull(input)) {
                return null;
            }
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                return null;
            }
            ImageReader reader = readers.next();
            try {
                if (!"png".equalsIgnoreCase(reader.getFormatName())) {
                    return null;
                }
                reader.setInput(input, true, true);
                // Dimensions come from the header, before any pixel is inflated.
                if ((long) reader.getWidth(0) * reader.getHeight(0) > MAX_PIXELS) {
                    throw new TooLargeException();
                }
                return reader.read(0);
            } finally {
                reader.dispose();
            }
        }
    }

    private static boolean cornersTransparent(BufferedImage image) {
        int right = image.getWidth() - 1;
        int bottom = image.getHeight() - 1;
        return transparent(image, 0, 0) && transparent(image, right, 0)
                && transparent(image, 0, bottom) && transparent(image, right, bottom);
    }

    private static boolean borderTransparent(BufferedImage image) {
        int right = image.getWidth() - 1;
        int bottom = image.getHeight() - 1;
        int samples = 0;
        int clear = 0;
        for (int index = 0; index < SAMPLES_PER_EDGE; index++) {
            int x = (int) ((long) right * index / (SAMPLES_PER_EDGE - 1));
            int y = (int) ((long) bottom * index / (SAMPLES_PER_EDGE - 1));
            int[][] points = {{x, 0}, {x, bottom}, {0, y}, {right, y}};
            for (int[] point : points) {
                samples++;
                clear += transparent(image, point[0], point[1]) ? 1 : 0;
            }
        }
        return clear >= samples * MIN_TRANSPARENT_BORDER_SHARE;
    }

    private static boolean transparent(BufferedImage image, int x, int y) {
        return (image.getRGB(x, y) >>> ALPHA_SHIFT) <= MAX_TRANSPARENT_ALPHA;
    }

    private static final class TooLargeException extends Exception {
    }
}
