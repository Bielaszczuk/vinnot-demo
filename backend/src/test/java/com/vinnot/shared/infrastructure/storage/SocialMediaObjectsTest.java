package com.vinnot.shared.infrastructure.storage;

import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SocialMediaObjectsTest {

    static byte[] jpeg() {
        return image("jpeg", 4, 5);
    }

    static byte[] png() {
        return image("png", 3, 2);
    }

    static byte[] image(String format, int width, int height) {
        try {
            var output = new ByteArrayOutputStream();
            ImageIO.write(new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB), format, output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    @Test
    void acceptsRelativeLowercaseVersionedJpegAndPngKeys() {
        for (String key : new String[]{"hero-ab12.png", "posts/3f2a9c/ig-01-ab12cd.jpg", "a/b/c/d.jpg"}) {
            assertThat(SocialMediaObjects.requireKey(key)).isEqualTo(key);
        }
        assertThat(SocialMediaObjects.requireKey("a".repeat(156) + ".jpg")).hasSize(SocialMediaObjects.MAX_KEY_LENGTH);
    }

    @Test
    void rejectsTraversalAbsoluteUppercaseOtherExtensionsAndOverlongKeys() {
        String[] invalid = {
            null, "", " ", "../x.jpg", "a/../b.jpg", "a/./b.jpg", "/a.jpg", "a//b.jpg", "a/.jpg", "a.jpg/",
            "A.jpg", "a.JPG", "a.jpeg", "a.webp", "a.gif", "a", "a b.jpg", "a\\b.jpg", "a_b.jpg", "a.b.jpg",
            "-a.jpg", "a-.jpg", "a/-b.png", "%2e%2e/a.jpg", "a".repeat(157) + ".jpg"
        };
        for (String key : invalid) {
            assertThatThrownBy(() -> SocialMediaObjects.requireKey(key))
                    .as(String.valueOf(key))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Invalid social media key");
        }
    }

    @Test
    void contentTypeFollowsTheKeyExtension() {
        assertThat(SocialMediaObjects.contentType("x/slide-1.jpg")).isEqualTo("image/jpeg");
        assertThat(SocialMediaObjects.contentType("x/hero.png")).isEqualTo("image/png");
    }

    @Test
    void acceptsMatchingJpegAndPngContent() {
        SocialMediaObjects.requireContent("a/slide.jpg", jpeg(), "image/jpeg");
        SocialMediaObjects.requireContent("a/hero.png", png(), "image/png");
    }

    @Test
    void rejectsContentTypesOtherThanJpegAndPngAndExtensionMismatches() {
        assertThatThrownBy(() -> SocialMediaObjects.requireContent("a/x.jpg", jpeg(), "image/jpg"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SocialMediaObjects.requireContent("a/x.png", image("gif", 1, 1), "image/gif"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SocialMediaObjects.requireContent("a/x.jpg", png(), "image/png"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Social media content type does not match the key extension");
        assertThatThrownBy(() -> SocialMediaObjects.requireContent("a/x.jpg", png(), "image/jpeg"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Declared file type does not match file content");
        assertThatThrownBy(() -> SocialMediaObjects.requireContent("a/x.png", null, "image/png"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SocialMediaObjects.requireContent("a/x.png", new byte[0], "image/png"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsContentOverTheSocialMediaSizeCap() {
        byte[] valid = jpeg();
        byte[] oversized = Arrays.copyOf(valid, SocialMediaObjects.MAX_BYTES + 1);
        assertThatThrownBy(() -> SocialMediaObjects.requireContent("a/x.jpg", oversized, "image/jpeg"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Social media file exceeds the 5MB limit");
    }

    @Test
    void rejectsImagesOverThePixelLimitWithoutDecodingThem() {
        byte[] huge = png();
        // IHDR width and height start at byte 16; 10000x10000 exceeds the shared 24 MP limit.
        writeInt(huge, 16, 10_000);
        writeInt(huge, 20, 10_000);
        assertThatThrownBy(() -> SocialMediaObjects.requireContent("a/x.png", huge, "image/png"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static void writeInt(byte[] bytes, int offset, int value) {
        bytes[offset] = (byte) (value >>> 24);
        bytes[offset + 1] = (byte) (value >>> 16);
        bytes[offset + 2] = (byte) (value >>> 8);
        bytes[offset + 3] = (byte) value;
    }
}
