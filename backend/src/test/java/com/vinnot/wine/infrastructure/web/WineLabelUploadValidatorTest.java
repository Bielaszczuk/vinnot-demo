package com.vinnot.wine.infrastructure.web;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import java.util.concurrent.Semaphore;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.io.ByteArrayInputStream;
import java.nio.ByteBuffer;
import java.util.zip.CRC32;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WineLabelUploadValidatorTest {

    private final WineLabelUploadValidator validator = new WineLabelUploadValidator();

    @Test
    void rejectsSaturatedProcessingAndRecoversAfterRelease() throws Exception {
        var limited = new WineLabelUploadValidator(1);
        var slots = (Semaphore) ReflectionTestUtils.getField(limited, "processingSlots");
        byte[] bytes = jpeg(720, 960);
        slots.acquire();
        try {
            assertThatThrownBy(() -> limited.sanitizeCatalogImage(bytes, "image/jpeg"))
                    .isInstanceOf(ExternalServiceUnavailableException.class)
                    .extracting("code").isEqualTo("IMAGE_PROCESSING_BUSY");
        } finally {
            slots.release();
        }
        assertThat(limited.sanitizeCatalogImage(bytes, "image/jpeg").bytes()).isNotEmpty();
        assertThat(slots.availablePermits()).isEqualTo(1);
        assertThatThrownBy(() -> limited.sanitizeCatalogImage(
                new byte[]{(byte) 255, (byte) 216, (byte) 255, 0}, "image/jpeg"))
                .isInstanceOf(DomainException.class);
        assertThat(slots.availablePermits()).isEqualTo(1);
        assertThatThrownBy(() -> new WineLabelUploadValidator(0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new WineLabelUploadValidator(9)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void boundsActualMultipartStreamEvenIfDeclaredSizeIsSmaller() {
        var file = new MockMultipartFile("image", "label.jpg", "image/jpeg", new byte[8 * 1024 * 1024 + 1]) {
            @Override
            public long getSize() {
                return 1;
            }
        };
        assertThatThrownBy(() -> validator.validate(file)).isInstanceOf(DomainException.class)
                .hasMessageContaining("8MB");
    }

    @Test
    void rejectsOversizedPngHeaderWithoutAllocatingItsBitmap() throws IOException {
        var image = new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB);
        var output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        byte[] bytes = output.toByteArray();
        ByteBuffer.wrap(bytes).putInt(16, 100_000).putInt(20, 100_000);
        var crc = new CRC32();
        crc.update(bytes, 12, 17);
        ByteBuffer.wrap(bytes).putInt(29, (int) crc.getValue());
        var file = new MockMultipartFile("image", "huge.png", "image/png", bytes);
        assertThatThrownBy(() -> validator.validate(file)).isInstanceOf(DomainException.class)
                .hasMessageContaining("pixel limit");
        assertThatThrownBy(() -> validator.sanitizeCatalogImage(bytes, "image/png"))
                .isInstanceOf(DomainException.class).hasMessageContaining("pixel limit");
    }

    @Test
    void subsamplesLargePermittedImagesBeforeNormalizingPersistence() throws IOException {
        byte[] bytes = jpeg(3200, 2400);
        var result = validator.sanitizeCatalogImage(bytes, "image/jpeg");
        var decoded = ImageIO.read(new ByteArrayInputStream(result.bytes()));
        assertThat(decoded.getWidth()).isEqualTo(1600);
        assertThat(decoded.getHeight()).isEqualTo(1200);
    }

    @Test
    void rejectsOversizedJpegDimensionsFromHeaderBeforeDecodingPixels() throws IOException {
        byte[] bytes = jpeg(720, 960);
        boolean patched = false;
        for (int i = 0; i < bytes.length - 9; i++) {
            if ((bytes[i] & 255) == 255 && (bytes[i + 1] & 255) == 192) {
                // SOF: precision, height, width. No 24-million-pixel bitmap is allocated.
                bytes[i + 5] = 0x7F;
                bytes[i + 6] = (byte) 0xFF;
                bytes[i + 7] = 0x7F;
                bytes[i + 8] = (byte) 0xFF;
                patched = true;
                break;
            }
        }
        assertThat(patched).isTrue();
        var file = new MockMultipartFile("image", "bomb.jpg", "image/jpeg", bytes);
        assertThatThrownBy(() -> validator.validate(file)).isInstanceOf(DomainException.class)
                .hasMessageContaining("pixel limit");
        assertThatThrownBy(() -> validator.validateAndSanitizeForPersistence(file))
                .isInstanceOf(DomainException.class).hasMessageContaining("pixel limit");
        assertThatThrownBy(() -> validator.sanitizeCatalogImage(bytes, "image/jpeg"))
                .isInstanceOf(DomainException.class).hasMessageContaining("pixel limit");
    }

    @Test
    void rejectsMissingMimeAndCorruptImageAsDomainErrors() throws IOException {
        assertThatThrownBy(() -> validator.validate(new MockMultipartFile("image", "label.jpg", null, jpeg(720, 960))))
                .isInstanceOf(DomainException.class).extracting("code").isEqualTo("INVALID_LABEL_IMAGE");
        var corrupt = new MockMultipartFile("image", "label.jpg", "image/jpeg",
                new byte[]{(byte) 255, (byte) 216, (byte) 255, 0});
        assertThatThrownBy(() -> validator.validate(corrupt)).isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("INVALID_LABEL_IMAGE");
    }

    @Test
    void acceptsJpegWhenMimeAndMagicBytesAgree() throws IOException {
        byte[] bytes = jpeg(720, 960);
        MockMultipartFile file = new MockMultipartFile(
                "image", "label.jpg", "image/jpeg", bytes);

        WineLabelUploadValidator.ValidatedImage result = validator.validate(file);

        assertThat(result.bytes()).isEqualTo(bytes);
        assertThat(result.contentType()).isEqualTo("image/jpeg");
    }

    @Test
    void rejectsImagesWithInsufficientResolution() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "image", "label.jpg", "image/jpeg", jpeg(200, 300));

        assertThatThrownBy(() -> validator.validate(file))
                .isInstanceOfSatisfying(DomainException.class, exception -> {
                    assertThat(exception.getCode())
                            .isEqualTo("LABEL_IMAGE_RESOLUTION_TOO_LOW");
                    assertThat(exception.getMessage()).contains("resolution");
                });
    }

    @Test
    void rejectsSpoofedMimeType() {
        MockMultipartFile file = new MockMultipartFile(
                "image", "label.jpg", "image/jpeg", "not-an-image".getBytes());

        assertThatThrownBy(() -> validator.validate(file))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("does not match");
    }

    @Test
    void preservesScannerJpegAndPngContractDespiteStorageWebpSupport() {
        byte[] bytes = "RIFF0000WEBPnot-a-decodable-image"
                .getBytes(StandardCharsets.US_ASCII);
        MockMultipartFile file = new MockMultipartFile(
                "image", "label.webp", "image/webp", bytes);

        assertThatThrownBy(() -> validator.validate(file))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("JPEG or PNG");
    }

    @Test
    void rejectsAnUnderexposedLabelBeforeProviderProcessing() throws IOException {
        BufferedImage image = new BufferedImage(720, 960, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "jpeg", output);
        MockMultipartFile file = new MockMultipartFile(
                "image", "label.jpg", "image/jpeg", output.toByteArray());

        assertThatThrownBy(() -> validator.validate(file))
                .isInstanceOf(DomainException.class)
                .extracting(error -> ((DomainException) error).getCode())
                .isEqualTo("LABEL_IMAGE_TOO_DARK");
    }

    @Test
    void persistedImageIsReencodedWithoutTrailingMetadata() throws IOException {
        byte[] jpeg = jpeg(900, 1200);
        byte[] marker = "GPS-EXIF-SHOULD-NOT-SURVIVE"
                .getBytes(StandardCharsets.UTF_8);
        byte[] withMetadata = new byte[jpeg.length + marker.length];
        System.arraycopy(jpeg, 0, withMetadata, 0, jpeg.length);
        System.arraycopy(marker, 0, withMetadata, jpeg.length, marker.length);
        MockMultipartFile file = new MockMultipartFile(
                "image", "label.jpg", "image/jpeg", withMetadata);

        WineLabelUploadValidator.ValidatedImage result =
                validator.validateAndSanitizeForPersistence(file);

        assertThat(result.contentType()).isEqualTo("image/jpeg");
        assertThat(new String(result.bytes(), StandardCharsets.ISO_8859_1))
                .doesNotContain("GPS-EXIF-SHOULD-NOT-SURVIVE");
    }

    @Test
    void catalogImagesAllowSmallOrDarkArtworkButStillRequireAuthenticImageBytes() throws IOException {
        byte[] small = jpeg(100, 100);
        var result = validator.sanitizeCatalogImage(small, "image/jpeg");
        assertThat(result.contentType()).isEqualTo("image/jpeg");
        assertThat(ImageIO.read(new ByteArrayInputStream(result.bytes())).getWidth()).isEqualTo(100);
        assertThatThrownBy(() -> validator.sanitizeCatalogImage("not an image".getBytes(), "image/jpeg"))
                .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> validator.sanitizeCatalogImage(small, "image/png"))
                .isInstanceOf(DomainException.class);
    }

    private byte[] jpeg(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int shade = ((x / 12 + y / 12) % 2 == 0) ? 235 : 45;
                image.setRGB(x, y, (shade << 16) | (shade << 8) | shade);
            }
        }
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "jpeg", output);
        return output.toByteArray();
    }
}
