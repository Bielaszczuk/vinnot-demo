package com.vinnot.shared.infrastructure.media;

import org.junit.jupiter.api.Test;
import java.awt.image.BufferedImage;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import static org.assertj.core.api.Assertions.assertThat;

class RasterOrientationTest {
    @Test
    void exifMustBeInsideMetadataAndMalformedOffsetsNeverEscapeItsContainer() {
        byte[] exif = exif(6);
        byte[] jpeg = new byte[exif.length + 6];
        jpeg[0] = (byte) 255;
        jpeg[1] = (byte) 216;
        jpeg[2] = (byte) 255;
        jpeg[3] = (byte) 225;
        ByteBuffer.wrap(jpeg).putShort(4, (short) (exif.length + 2));
        System.arraycopy(exif, 0, jpeg, 6, exif.length);
        assertThat(RasterOrientation.read(jpeg)).isEqualTo(6);
        assertThat(RasterOrientation.read(exif)).isEqualTo(1);
        jpeg[18] = (byte) 255;
        assertThat(RasterOrientation.read(jpeg)).isEqualTo(1);
    }

    @Test
    void allEightTransformsPreserveEveryPixelAndSwapDimensionsWhenRequired() {
        BufferedImage original = new BufferedImage(2, 3, BufferedImage.TYPE_INT_ARGB);
        original.setRGB(0, 0, 0xff010203);
        original.setRGB(1, 2, 0xff040506);
        for (int orientation = 1; orientation <= 8; orientation++) {
            var transformed = RasterOrientation.apply(original, orientation);
            assertThat(transformed.getWidth()).isEqualTo(orientation >= 5 ? 3 : 2);
            assertThat(transformed.getHeight()).isEqualTo(orientation >= 5 ? 2 : 3);
            int nonEmpty = 0;
            for (int y = 0; y < transformed.getHeight(); y++) {
                for (int x = 0; x < transformed.getWidth(); x++) {
                    if (transformed.getRGB(x, y) != 0) { nonEmpty++; }
                }
            }
            assertThat(nonEmpty).isEqualTo(2);
        }
        assertThat(RasterOrientation.apply(original, 6).getRGB(2, 0)).isEqualTo(original.getRGB(0, 0));
    }

    private byte[] exif(int orientation) {
        ByteBuffer bytes = ByteBuffer.allocate(32).order(ByteOrder.LITTLE_ENDIAN);
        bytes.put(new byte[]{'E', 'x', 'i', 'f', 0, 0, 'I', 'I'});
        bytes.putShort((short) 42).putInt(8).putShort((short) 1);
        bytes.putShort((short) 274).putShort((short) 3).putInt(1).putShort((short) orientation).putShort((short) 0).putInt(0);
        return bytes.array();
    }
}
