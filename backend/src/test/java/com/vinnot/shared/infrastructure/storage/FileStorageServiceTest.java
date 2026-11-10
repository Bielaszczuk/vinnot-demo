package com.vinnot.shared.infrastructure.storage;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.IOException;
import java.io.ByteArrayOutputStream;
import java.awt.image.BufferedImage;
import java.util.Base64;
import javax.imageio.ImageIO;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FileStorageServiceTest {

    @Test
    void boundsActualStreamRegardlessOfDeclaredLength() throws IOException {
        int maximum = 8 * 1024 * 1024;
        ByteArrayInputStream oversized = new ByteArrayInputStream(new byte[maximum + 10]);
        assertThatThrownBy(() -> FileStorageService.readImageContent(oversized))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(oversized.available()).isEqualTo(9);
        assertThat(FileStorageService.readImageContent(
                new ByteArrayInputStream(new byte[maximum]))).hasSize(maximum);
        assertThat(FileStorageService.readImageContent(InputStream.nullInputStream())).isEmpty();
    }

    @Test
    void rejectsInvalidDeclaredAndActualLengths() {
        for (long length : new long[]{-1, 0, 8 * 1024 * 1024 + 1}) {
            assertThatThrownBy(() -> FileStorageService.validateImageFile("image/png", length))
                    .isInstanceOf(IllegalArgumentException.class);
        }
        assertThatThrownBy(() -> FileStorageService.validateImageContent(
                new byte[8 * 1024 * 1024 + 1], "image/png"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void derivesExtensionFromVerifiedContentTypeInsteadOfClientFilename() {
        assertThat(FileStorageService.getFileExtension("image/jpeg")).isEqualTo(".jpg");
        assertThat(FileStorageService.getFileExtension("image/png")).isEqualTo(".png");
        assertThat(FileStorageService.getFileExtension("image/gif")).isEqualTo(".gif");
        assertThat(FileStorageService.getFileExtension("image/webp")).isEqualTo(".webp");
    }

    @Test
    void rejectsDeclaredTypeThatDoesNotMatchFileSignature() {
        byte[] jpeg = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00};

        assertThatThrownBy(() ->
                FileStorageService.validateImageContent(jpeg, "image/png"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Declared file type does not match file content");
    }

    @Test
    void recognizesSupportedImageSignatures() throws IOException {
        for (String format : new String[]{"jpeg", "png", "gif"}) {
            var output = new ByteArrayOutputStream();
            var image = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
            ImageIO.write(image, format, output);
            image.flush();
            assertThat(FileStorageService.validateImageContent(output.toByteArray(), "image/" + format))
                    .isEqualTo("image/" + format);
        }
        assertThat(FileStorageService.validateImageContent(
                Base64.getDecoder().decode("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA"),
                "image/webp")).isEqualTo("image/webp");
    }

    @Test
    void rejectsSignatureOnlyInsteadOfPersistingAnUnreadableImage() {
        assertThatThrownBy(() -> FileStorageService.validateImageContent(
                "GIF89a".getBytes(StandardCharsets.US_ASCII), "image/gif"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void preventsDeletingAvatarOwnedByAnotherUser() {
        UUID owner = UUID.randomUUID();
        UUID attacker = UUID.randomUUID();
        String avatarUrl = "/api/uploads/avatars/avatar_" + owner + "_file.jpg";

        assertThatThrownBy(() ->
                FileStorageService.ownedAvatarFilename(avatarUrl, attacker))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Avatar does not belong to user");
    }

    @Test
    void onlyAvatarsStoredForTheUserCountAsOwned() {
        UUID user = UUID.randomUUID();

        assertThat(FileStorageService.isOwnedAvatarUrl("/api/uploads/avatars/avatar_" + user + "_" + UUID.randomUUID() + ".png", user)).isTrue();
        assertThat(FileStorageService.isOwnedAvatarUrl("https://lh3.googleusercontent.com/a/picture=s96-c", user)).isFalse();
        assertThat(FileStorageService.isOwnedAvatarUrl("/api/uploads/avatars/avatar_" + UUID.randomUUID() + "_x.png", user)).isFalse();
        assertThat(FileStorageService.isOwnedAvatarUrl(" ", user)).isFalse();
        assertThat(FileStorageService.isOwnedAvatarUrl(null, user)).isFalse();
    }
}
