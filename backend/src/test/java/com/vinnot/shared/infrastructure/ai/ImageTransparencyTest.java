package com.vinnot.shared.infrastructure.ai;

import com.vinnot.shared.infrastructure.ai.ImageTransparency.Verdict;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;

import static org.assertj.core.api.Assertions.assertThat;

class ImageTransparencyTest {

    @Test
    void transparentBackgroundWithAnOpaqueSubjectIsUsable() {
        assertThat(ImageTransparency.inspect(transparentWithSubject(), true)).isEqualTo(Verdict.USABLE);
    }

    @Test
    void imageWithoutAlphaChannelIsOpaque() {
        assertThat(ImageTransparency.inspect(png(filled(BufferedImage.TYPE_INT_RGB, Color.WHITE)), true))
                .isEqualTo(Verdict.OPAQUE);
    }

    @Test
    void alphaChannelPaintedWhiteIsOpaque() {
        assertThat(ImageTransparency.inspect(png(filled(BufferedImage.TYPE_INT_ARGB, Color.WHITE)), true))
                .isEqualTo(Verdict.OPAQUE);
    }

    @Test
    void transparentCornersWithAnOpaqueFrameAreOpaque() {
        var image = new BufferedImage(100, 150, BufferedImage.TYPE_INT_ARGB);
        var graphics = image.createGraphics();
        graphics.setColor(Color.WHITE);
        graphics.fillRect(2, 0, 96, 150);
        graphics.dispose();
        assertThat(ImageTransparency.inspect(png(image), true)).isEqualTo(Verdict.OPAQUE);
    }

    @Test
    void opaqueImageIsUsableWhenTransparencyWasNotRequested() {
        assertThat(ImageTransparency.inspect(png(filled(BufferedImage.TYPE_INT_RGB, Color.WHITE)), false))
                .isEqualTo(Verdict.USABLE);
    }

    @Test
    void bytesThatAreNotAPngAreRejected() throws IOException {
        var jpeg = new ByteArrayOutputStream();
        ImageIO.write(filled(BufferedImage.TYPE_INT_RGB, Color.RED), "jpg", jpeg);
        assertThat(ImageTransparency.inspect("not an image".getBytes(), false)).isEqualTo(Verdict.NOT_PNG);
        assertThat(ImageTransparency.inspect(jpeg.toByteArray(), false)).isEqualTo(Verdict.NOT_PNG);
        assertThat(ImageTransparency.inspect(new byte[0], false)).isEqualTo(Verdict.NOT_PNG);
    }

    @Test
    void oversizedDimensionsAreRejectedBeforeDecoding() {
        var huge = new BufferedImage(4097, 4097, BufferedImage.TYPE_BYTE_BINARY);
        assertThat(ImageTransparency.inspect(png(huge), false)).isEqualTo(Verdict.TOO_LARGE);
    }

    static byte[] transparentWithSubject() {
        var image = new BufferedImage(100, 150, BufferedImage.TYPE_INT_ARGB);
        var graphics = image.createGraphics();
        graphics.setColor(new Color(120, 40, 50));
        graphics.fillOval(20, 30, 60, 90);
        graphics.dispose();
        return png(image);
    }

    static byte[] opaque() {
        return png(filled(BufferedImage.TYPE_INT_RGB, Color.WHITE));
    }

    private static BufferedImage filled(int type, Color color) {
        var image = new BufferedImage(100, 150, type);
        var graphics = image.createGraphics();
        graphics.setColor(color);
        graphics.fillRect(0, 0, 100, 150);
        graphics.dispose();
        return image;
    }

    private static byte[] png(BufferedImage image) {
        try {
            var out = new ByteArrayOutputStream();
            ImageIO.write(image, "png", out);
            return out.toByteArray();
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
