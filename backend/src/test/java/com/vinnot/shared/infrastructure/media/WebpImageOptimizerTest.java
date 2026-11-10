package com.vinnot.shared.infrastructure.media;

import com.vinnot.shared.application.media.ImageOptimizationPort;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import org.junit.jupiter.api.Test;
import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.ByteBuffer;
import java.io.InputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.zip.CRC32;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WebpImageOptimizerTest {
    private final WebpImageOptimizer optimizer = new WebpImageOptimizer(System.getenv().getOrDefault("VINNOT_WEBP_ENCODER", "cwebp"), 2);

    @Test
    void transparentAvatarIsWebpBoundedAndMetadataFree() throws Exception {
        BufferedImage source = new BufferedImage(1800, 1200, BufferedImage.TYPE_INT_ARGB);
        source.setRGB(100, 100, Color.RED.getRGB());
        byte[] png = png(source);
        var image = optimizer.optimize(new ByteArrayInputStream(png), "image/png", png.length, ImageOptimizationPort.Purpose.AVATAR);
        assertThat(image.width()).isEqualTo(512);
        assertThat(image.height()).isEqualTo(341);
        assertThat(image.bytes().length).isLessThan(128 * 1024);
        assertThat(new String(image.bytes(), 0, 4, StandardCharsets.US_ASCII)).isEqualTo("RIFF");
        assertThat(new String(image.bytes(), 8, 4, StandardCharsets.US_ASCII)).isEqualTo("WEBP");
        assertThat(new String(image.bytes(), StandardCharsets.ISO_8859_1)).doesNotContain("EXIF", "XMP ", "ICCP");
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(image.bytes()));
        assertThat(decoded.getColorModel().hasAlpha()).isTrue();
        assertThat(decoded.getRGB(0, 0) >>> 24).isZero();
    }

    @Test
    void rejectsMimeSpoofAndOversizedActualStreamBeforeEncoding() throws Exception {
        byte[] png = png(new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB));
        assertThatThrownBy(() -> optimizer.optimize(new ByteArrayInputStream(png), "image/jpeg", png.length, ImageOptimizationPort.Purpose.COVER))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("type");
        assertThatThrownBy(() -> optimizer.optimize(new ByteArrayInputStream(new byte[8 * 1024 * 1024 + 1]), "image/png", 1, ImageOptimizationPort.Purpose.LABEL))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("8MB");
    }

    @Test
    void missingEncoderIsAnExplicitRetryableFailureAndReleasesTheSlot() throws Exception {
        byte[] png = png(new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB));
        var unavailable = new WebpImageOptimizer("/does-not-exist/cwebp", 1);
        for (int attempt = 0; attempt < 2; attempt++) {
            assertThatThrownBy(() -> unavailable.optimize(new ByteArrayInputStream(png), "image/png", png.length, ImageOptimizationPort.Purpose.COVER))
                    .isInstanceOf(ExternalServiceUnavailableException.class).hasMessageContaining("unavailable");
        }
    }

    @Test
    void pixelBombHeaderIsRejectedWithoutAllocatingItsClaimedPixels() throws Exception {
        byte[] png = png(new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB));
        ByteBuffer.wrap(png).putInt(16, 100_000).putInt(20, 100_000);
        var crc = new CRC32();
        crc.update(png, 12, 17);
        ByteBuffer.wrap(png).putInt(29, (int) crc.getValue());
        assertThatThrownBy(() -> optimizer.optimize(new ByteArrayInputStream(png), "image/png", png.length, ImageOptimizationPort.Purpose.COVER))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("pixel limit");
    }

    @Test
    void concurrentDecodingIsBoundedAndADroppedRequestDoesNotConsumeTheSlot() throws Exception {
        byte[] png = png(new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB));
        CountDownLatch entered = new CountDownLatch(1), release = new CountDownLatch(1);
        var bounded = new WebpImageOptimizer(System.getenv().getOrDefault("VINNOT_WEBP_ENCODER", "cwebp"), 1);
        InputStream waiting = new ByteArrayInputStream(png) {
            @Override public synchronized byte[] readNBytes(int length) {
                entered.countDown();
                try {
                    if (!release.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Fixture timed out");
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException(exception);
                }
                return png;
            }
        };
        try (var executor = Executors.newSingleThreadExecutor()) {
            var first = executor.submit(() -> bounded.optimize(waiting, "image/png", png.length, ImageOptimizationPort.Purpose.COVER));
            try {
                assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
                assertThatThrownBy(() -> bounded.optimize(new ByteArrayInputStream(png), "image/png", png.length, ImageOptimizationPort.Purpose.COVER))
                        .isInstanceOf(ExternalServiceUnavailableException.class);
            } finally { release.countDown(); }
            assertThat(first.get(5, TimeUnit.SECONDS).width()).isEqualTo(1);
            assertThat(bounded.optimize(new ByteArrayInputStream(png), "image/png", png.length, ImageOptimizationPort.Purpose.COVER).width()).isEqualTo(1);
        }
    }

    private byte[] png(BufferedImage image) throws Exception {
        var bytes = new ByteArrayOutputStream();
        ImageIO.write(image, "png", bytes);
        return bytes.toByteArray();
    }
}
