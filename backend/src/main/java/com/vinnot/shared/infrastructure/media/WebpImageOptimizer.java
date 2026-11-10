package com.vinnot.shared.infrastructure.media;

import com.vinnot.shared.application.media.ImageOptimizationPort;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.infrastructure.image.ImageResourceLimits;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageInputStream;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

/** Decode before invoking the trusted libwebp encoder; single-frame photos, bounded resources, no shell. */
@Component
public class WebpImageOptimizer implements ImageOptimizationPort {
    private final String encoder;
    private final Semaphore slots;

    public WebpImageOptimizer(@Value("${app.uploads.webp-encoder:cwebp}") String encoder,
            @Value("${app.uploads.max-concurrent-image-processing:2}") int concurrency) {
        if (concurrency < 1 || concurrency > 2) { throw new IllegalArgumentException("WebP concurrency must be 1 or 2"); }
        this.encoder = encoder;
        this.slots = new Semaphore(concurrency);
    }

    @Override
    public OptimizedImage optimize(InputStream source, String declaredType, long size, Purpose purpose) {
        if (size <= 0 || size > ImageResourceLimits.MAX_BYTES
                || !Set.of("image/jpeg", "image/png", "image/webp", "image/gif").contains(Objects.isNull(declaredType) ? "" : declaredType)) {
            throw new IllegalArgumentException("Image must be JPEG, PNG, GIF or WebP, up to 8MB");
        }
        if (!slots.tryAcquire()) { throw unavailable("IMAGE_PROCESSING_BUSY"); }
        BufferedImage pixels = null;
        Path directory = null;
        try {
            byte[] inputBytes = ImageResourceLimits.readBounded(source);
            pixels = decode(inputBytes, declaredType, purpose);
            BufferedImage oriented = RasterOrientation.apply(pixels, RasterOrientation.read(inputBytes));
            if (oriented != pixels) {
                pixels.flush();
                pixels = oriented;
            }
            BufferedImage normalized = resize(pixels, purpose.longEdge());
            pixels.flush();
            pixels = normalized;
            directory = Files.createTempDirectory("vinnot-webp-");
            Path input = directory.resolve("normalized.png");
            Path output = directory.resolve("image.webp");
            if (!ImageIO.write(pixels, "png", input.toFile())) { throw unavailable("IMAGE_ENCODER_UNAVAILABLE"); }
            Process process = new ProcessBuilder(encoder, "-quiet", "-q", "85", "-m", "3", "-low_memory",
                    "-metadata", "none", input.toString(), "-o", output.toString())
                    .redirectOutput(ProcessBuilder.Redirect.DISCARD).redirectError(ProcessBuilder.Redirect.DISCARD).start();
            try {
                if (!process.waitFor(10, TimeUnit.SECONDS)) { throw unavailable("IMAGE_PROCESSING_TIMEOUT"); }
                if (process.exitValue() != 0 || !Files.exists(output)) { throw unavailable("IMAGE_ENCODING_FAILED"); }
            } finally {
                if (process.isAlive()) {
                    process.destroyForcibly();
                    process.waitFor(2, TimeUnit.SECONDS);
                }
            }
            if (Files.size(output) > purpose.maxBytes()) {
                throw new IllegalArgumentException("Optimized image exceeds the size limit; choose a simpler image");
            }
            byte[] bytes = Files.readAllBytes(output);
            ImageResourceLimits.validateDimensions(bytes);
            return new OptimizedImage(bytes, pixels.getWidth(), pixels.getHeight());
        } catch (IOException exception) { throw unavailable("IMAGE_ENCODER_UNAVAILABLE"); }
        catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw unavailable("IMAGE_PROCESSING_INTERRUPTED");
        } finally {
            if (Objects.nonNull(pixels)) { pixels.flush(); }
            if (Objects.nonNull(directory)) {
                for (String filename : Set.of("normalized.png", "image.webp")) {
                    try { Files.deleteIfExists(directory.resolve(filename)); } catch (IOException ignored) { /* private ephemeral file */ }
                }
                try { Files.deleteIfExists(directory); } catch (IOException ignored) { /* private ephemeral directory */ }
            }
            slots.release();
        }
    }

    private BufferedImage decode(byte[] bytes, String type, Purpose purpose) throws IOException {
        try (var input = new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) { throw new IllegalArgumentException("Image cannot be decoded"); }
            var reader = readers.next();
            try {
                reader.setInput(input, false, true);
                String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                String detected = "image/" + (format.equals("jpg") ? "jpeg" : format);
                if (!detected.equals(type)) { throw new IllegalArgumentException("Image type does not match its content"); }
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (!ImageResourceLimits.acceptsDimensions(width, height)) { throw new IllegalArgumentException("Image exceeds the pixel limit"); }
                // Preserve GIF compatibility by explicitly taking its first frame, never a video/animation.
                var params = reader.getDefaultReadParam();
                int sample = Math.max(1, Math.max(width, height) / purpose.longEdge());
                params.setSourceSubsampling(sample, sample, 0, 0);
                return reader.read(0, params);
            } finally { reader.dispose(); }
        }
    }

    private BufferedImage resize(BufferedImage source, int longEdge) {
        double scale = Math.min(1.0, (double) longEdge / Math.max(source.getWidth(), source.getHeight()));
        BufferedImage target = new BufferedImage(Math.max(1, (int) Math.round(source.getWidth() * scale)),
                Math.max(1, (int) Math.round(source.getHeight() * scale)), BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = target.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.drawImage(source, 0, 0, target.getWidth(), target.getHeight(), null);
        } finally { graphics.dispose(); }
        return target;
    }

    private ExternalServiceUnavailableException unavailable(String code) {
        return new ExternalServiceUnavailableException(code, "Image processing is unavailable. Please try again shortly.", null);
    }
}
