package com.vinnot.wine.infrastructure.web;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.infrastructure.image.ImageResourceLimits;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import com.vinnot.shared.infrastructure.media.RasterOrientation;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;
import java.time.Duration;
import java.util.Objects;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;

/**
 * HTTP-edge validation for label uploads. Declared MIME and magic bytes must
 * agree before bytes enter the application layer.
 */
@Component
public class WineLabelUploadValidator {

    private static final long MAX_BYTES = ImageResourceLimits.MAX_BYTES;
    private static final int DEFAULT_CONCURRENT_PROCESSING = 2;
    private static final Duration PROCESSING_SLOT_WAIT = Duration.ofSeconds(2);
    private static final int MAX_CONCURRENT_PROCESSING = 8;
    private static final int MIN_SHORT_EDGE_PIXELS = 320;
    private static final int MIN_LONG_EDGE_PIXELS = 720;
    private static final int MAX_PERSISTED_LONG_EDGE_PIXELS = 1600;
    private static final double MINIMUM_MEAN_LUMINANCE = 12.0;
    private static final double MAXIMUM_MEAN_LUMINANCE = 248.0;
    private static final double MINIMUM_EDGE_ENERGY = 1.5;
    private static final int QUALITY_SAMPLE_DIVISOR = 160;
    private static final int RED_CHANNEL_SHIFT = 16;
    private static final int GREEN_CHANNEL_SHIFT = 8;
    private static final double RED_LUMINANCE_WEIGHT = 0.2126;
    private static final double GREEN_LUMINANCE_WEIGHT = 0.7152;
    private static final double BLUE_LUMINANCE_WEIGHT = 0.0722;
    private static final Map<String, byte[]> SIGNATURES = Map.of(
            "image/jpeg", new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF},
            "image/png", new byte[] {
                    (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A});
    private final Semaphore processingSlots;

    @Autowired
    public WineLabelUploadValidator(
            @Value("${app.uploads.max-concurrent-image-processing:2}") int concurrentProcessing) {
        if (concurrentProcessing < 1 || concurrentProcessing > MAX_CONCURRENT_PROCESSING) {
            throw new IllegalArgumentException("Image processing concurrency must be between 1 and 8");
        }
        processingSlots = new Semaphore(concurrentProcessing);
    }

    public WineLabelUploadValidator() {
        this(DEFAULT_CONCURRENT_PROCESSING);
    }

    public ValidatedImage validate(MultipartFile file) {
        ValidatedImage validated = readUpload(file);
        return withDecodedImage(validated.bytes(), true, decoded -> {
            validateQuality(decoded);
            return validated;
        });
    }

    private ValidatedImage readUpload(MultipartFile file) {
        if (Objects.isNull(file) || file.isEmpty()) {
            throw invalid("Wine-label image is required");
        }
        if (file.getSize() > MAX_BYTES) {
            throw invalid("Wine-label image must be 8MB or smaller");
        }
        String contentType = file.getContentType();
        if (Objects.isNull(contentType) || !SIGNATURES.containsKey(contentType)) {
            throw invalid("Wine-label image must be JPEG or PNG");
        }
        try (var content = file.getInputStream()) {
            byte[] bytes = ImageResourceLimits.readBounded(content);
            validateSignature(bytes, contentType);
            return new ValidatedImage(bytes, contentType);
        } catch (IOException exception) {
            throw invalid("Wine-label image could not be read");
        } catch (IllegalArgumentException exception) {
            throw invalid("Wine-label image must be 8MB or smaller");
        }
    }

    public ValidatedImage validateAndSanitizeForPersistence(MultipartFile file) {
        ValidatedImage validated = readUpload(file);
        return withDecodedImage(validated.bytes(), true, decoded -> {
            validateQuality(decoded);
            return encodeForPersistence(decoded);
        });
    }

    /** Catalog editing validates file safety without imposing camera/OCR quality requirements. */
    public ValidatedImage sanitizeCatalogImage(byte[] bytes, String contentType) {
        if (Objects.isNull(bytes) || Objects.isNull(contentType) || !SIGNATURES.containsKey(contentType) || bytes.length > MAX_BYTES) {
            throw invalid("Catalog image must be JPEG or PNG, up to 8MB");
        }
        validateSignature(bytes, contentType);
        return withDecodedImage(bytes, false, this::encodeForPersistence);
    }

    private <T> T withDecodedImage(byte[] bytes, boolean requireLabelResolution,
            Function<BufferedImage, T> operation) {
        if (!acquireProcessingSlot()) {
            throw new ExternalServiceUnavailableException("IMAGE_PROCESSING_BUSY",
                    "Image processing is busy. Please try again shortly.", null);
        }
        try {
            BufferedImage decoded = decodeBounded(bytes, requireLabelResolution);
            try {
                return operation.apply(decoded);
            } finally {
                decoded.flush();
            }
        } finally {
            processingSlots.release();
        }
    }

    /** Decoding takes a fraction of a second, so a short wait beats sending the member a busy error. */
    private boolean acquireProcessingSlot() {
        try {
            return processingSlots.tryAcquire(PROCESSING_SLOT_WAIT.toMillis(), TimeUnit.MILLISECONDS);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    private BufferedImage decodeBounded(byte[] bytes, boolean requireLabelResolution) {
        try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw invalid("Catalog image cannot be decoded");
            }
            var reader = readers.next();
            try {
                reader.setInput(input);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (!ImageResourceLimits.acceptsDimensions(width, height)) {
                    throw invalid("Image exceeds the pixel limit");
                }
                if (requireLabelResolution && (Math.min(width, height) < MIN_SHORT_EDGE_PIXELS
                        || Math.max(width, height) < MIN_LONG_EDGE_PIXELS)) {
                    throw new DomainException("LABEL_IMAGE_RESOLUTION_TOO_LOW", "Wine-label image resolution is too low");
                }
                var parameters = reader.getDefaultReadParam();
                int subsampling = Math.max(1, (Math.max(width, height)
                        + MAX_PERSISTED_LONG_EDGE_PIXELS - 1) / MAX_PERSISTED_LONG_EDGE_PIXELS);
                parameters.setSourceSubsampling(subsampling, subsampling, 0, 0);
                BufferedImage decoded = reader.read(0, parameters);
                BufferedImage oriented = RasterOrientation.apply(decoded, RasterOrientation.read(bytes));
                if (oriented != decoded) { decoded.flush(); }
                return oriented;
            } finally {
                reader.dispose();
            }
        } catch (IOException exception) {
            throw invalid("Image could not be decoded");
        }
    }

    private ValidatedImage encodeForPersistence(BufferedImage decoded) {
        BufferedImage normalized = normalizeForPersistence(decoded);
        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            if (!ImageIO.write(normalized, "jpeg", output)) {
                throw invalid("Image could not be normalized");
            }
            return new ValidatedImage(output.toByteArray(), "image/jpeg");
        } catch (IOException exception) {
            throw invalid("Image could not be normalized");
        } finally {
            normalized.flush();
        }
    }

    private BufferedImage normalizeForPersistence(BufferedImage source) {
        int longEdge = Math.max(source.getWidth(), source.getHeight());
        double scale = longEdge > MAX_PERSISTED_LONG_EDGE_PIXELS
                ? (double) MAX_PERSISTED_LONG_EDGE_PIXELS / longEdge : 1.0;
        int width = Math.max(1, (int) Math.round(source.getWidth() * scale));
        int height = Math.max(1, (int) Math.round(source.getHeight() * scale));
        BufferedImage normalized = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = normalized.createGraphics();
        try {
            graphics.setRenderingHint(
                    RenderingHints.KEY_INTERPOLATION,
                    RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.drawImage(source, 0, 0, width, height, null);
        } finally {
            graphics.dispose();
        }
        return normalized;
    }

    private void validateSignature(byte[] bytes, String contentType) {
        byte[] signature = SIGNATURES.get(contentType);
        if (!matches(bytes, 0, signature)) {
            throw invalid("Wine-label image content does not match its declared type");
        }
    }

    private boolean matches(byte[] bytes, int offset, byte[] signature) {
        if (bytes.length < offset + signature.length) {
            return false;
        }
        for (int index = 0; index < signature.length; index++) {
            if (bytes[offset + index] != signature[index]) {
                return false;
            }
        }
        return true;
    }

    private void validateQuality(BufferedImage image) {
        ImageQuality quality = measureQuality(image);
        if (quality.meanLuminance() < MINIMUM_MEAN_LUMINANCE) {
            throw new DomainException(
                    "LABEL_IMAGE_TOO_DARK", "The wine-label image is too dark");
        }
        if (quality.meanLuminance() > MAXIMUM_MEAN_LUMINANCE) {
            throw new DomainException(
                    "LABEL_IMAGE_TOO_BRIGHT", "The wine-label image is overexposed");
        }
        if (quality.edgeEnergy() < MINIMUM_EDGE_ENERGY) {
            throw new DomainException(
                    "LABEL_IMAGE_OUT_OF_FOCUS",
                    "The wine-label image lacks enough sharp detail");
        }
    }

    private ImageQuality measureQuality(BufferedImage image) {
        int step = Math.max(
                1,
                Math.min(image.getWidth(), image.getHeight()) / QUALITY_SAMPLE_DIVISOR);
        double luminanceSum = 0.0;
        double edgeSum = 0.0;
        long samples = 0;
        long edges = 0;
        for (int y = 0; y < image.getHeight(); y += step) {
            double previous = -1.0;
            for (int x = 0; x < image.getWidth(); x += step) {
                double luminance = luminance(image.getRGB(x, y));
                luminanceSum += luminance;
                samples++;
                if (previous >= 0.0) {
                    edgeSum += Math.abs(luminance - previous);
                    edges++;
                }
                previous = luminance;
            }
        }
        return new ImageQuality(
                samples == 0 ? 0.0 : luminanceSum / samples,
                edges == 0 ? 0.0 : edgeSum / edges);
    }

    private double luminance(int rgb) {
        int red = (rgb >> RED_CHANNEL_SHIFT) & 0xFF;
        int green = (rgb >> GREEN_CHANNEL_SHIFT) & 0xFF;
        int blue = rgb & 0xFF;
        return RED_LUMINANCE_WEIGHT * red
                + GREEN_LUMINANCE_WEIGHT * green
                + BLUE_LUMINANCE_WEIGHT * blue;
    }

    private DomainException invalid(String message) {
        return new DomainException("INVALID_LABEL_IMAGE", message);
    }

    public record ValidatedImage(byte[] bytes, String contentType) {
    }

    private record ImageQuality(double meanLuminance, double edgeEnergy) {
    }
}
