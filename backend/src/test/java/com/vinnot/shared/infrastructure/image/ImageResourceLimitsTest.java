package com.vinnot.shared.infrastructure.image;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.awt.image.BufferedImage;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Arrays;
import javax.imageio.ImageIO;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ImageResourceLimitsTest {

    @Test
    void sharesPixelBoundaryWithScannerWithoutIntegerOverflow() {
        assertThat(ImageResourceLimits.acceptsDimensions(6000, 4000)).isTrue();
        for (int[] pair : new int[][]{{6001, 4000}, {0, 1}, {1, 0}, {-1, 1}, {1, -1},
                {Integer.MAX_VALUE, Integer.MAX_VALUE}}) {
            assertThat(ImageResourceLimits.acceptsDimensions(pair[0], pair[1])).isFalse();
        }
    }

    @Test
    void rejectsMissingUnsupportedAndTruncatedHeaders() {
        for (byte[] invalid : Arrays.asList(null, new byte[0], new byte[]{1, 2, 3},
                new byte[]{(byte) 0xff, (byte) 0xd8, (byte) 0xff})) {
            assertThatThrownBy(() -> ImageResourceLimits.validateDimensions(invalid))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    void rejectsHugeGifDimensionsWithoutAllocatingTheDeclaredRaster() throws Exception {
        var image = new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB);
        var output = new ByteArrayOutputStream();
        ImageIO.write(image, "gif", output);
        image.flush();
        byte[] bytes = output.toByteArray();
        ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).putShort(6, (short) 6000)
                .putShort(8, (short) 6000);
        // The first image descriptor also declares its frame dimensions.
        for (int index = 13; index < bytes.length - 9; index++) {
            if (bytes[index] == 0x2c) {
                ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
                        .putShort(index + 5, (short) 6000).putShort(index + 7, (short) 6000);
                break;
            }
        }
        assertThatThrownBy(() -> ImageResourceLimits.validateDimensions(bytes))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("Image exceeds the pixel limit");
    }
}
