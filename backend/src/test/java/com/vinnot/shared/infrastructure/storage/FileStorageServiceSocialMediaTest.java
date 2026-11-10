package com.vinnot.shared.infrastructure.storage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Files;
import java.nio.file.Path;

import static com.vinnot.shared.infrastructure.storage.SocialMediaObjectsTest.jpeg;
import static com.vinnot.shared.infrastructure.storage.SocialMediaObjectsTest.png;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FileStorageServiceSocialMediaTest {
    @TempDir
    Path root;
    private final FileStorageService storage = new FileStorageService();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(storage, "avatarDir", root.resolve("avatars").toString());
        ReflectionTestUtils.setField(storage, "wineLabelDir", root.resolve("wine-labels").toString());
        ReflectionTestUtils.setField(storage, "wineLabelQuarantineDir", root.resolve("quarantine").toString());
        storage.init();
    }

    @Test
    void storesUnderTheSocialFolderNextToAvatarsAndReturnsThePublicApiPath() throws Exception {
        byte[] slide = jpeg();
        byte[] hero = png();

        assertThat(storage.storeSocialMedia("posts/p1/ig-01-ab12.jpg", slide, "image/jpeg"))
                .isEqualTo("/api/uploads/social/posts/p1/ig-01-ab12.jpg");
        assertThat(storage.storeSocialMedia("posts/p1/hero-cd34.png", hero, "image/png"))
                .isEqualTo("/api/uploads/social/posts/p1/hero-cd34.png");

        assertThat(Files.readAllBytes(root.resolve("social/posts/p1/ig-01-ab12.jpg"))).isEqualTo(slide);
        assertThat(Files.readAllBytes(root.resolve("social/posts/p1/hero-cd34.png"))).isEqualTo(hero);
        try (var files = Files.list(root.resolve("social/posts/p1"))) {
            assertThat(files.map(path -> path.getFileName().toString()))
                    .containsExactlyInAnyOrder("ig-01-ab12.jpg", "hero-cd34.png");
        }
    }

    @Test
    void loadsStoredObjectsWithTheContentTypeOfTheirExtensionAndMissingKeysAreEmpty() throws Exception {
        byte[] hero = png();
        storage.storeSocialMedia("posts/p1/hero.png", hero, "image/png");

        var loaded = storage.loadSocialMedia("posts/p1/hero.png").orElseThrow();
        assertThat(loaded.contentType()).isEqualTo("image/png");
        assertThat(loaded.size()).isEqualTo(hero.length);
        assertThat(loaded.content().readAllBytes()).isEqualTo(hero);
        assertThat(storage.loadSocialMedia("posts/p1/missing.png")).isEmpty();
    }

    @Test
    void rewritingAKeyIsIdempotentForEqualBytesAndRefusedForDifferentContent() throws Exception {
        byte[] first = SocialMediaObjectsTest.image("jpeg", 4, 4);
        byte[] other = SocialMediaObjectsTest.image("jpeg", 8, 8);
        storage.storeSocialMedia("posts/p1/ig-01.jpg", first, "image/jpeg");

        assertThat(storage.storeSocialMedia("posts/p1/ig-01.jpg", first, "image/jpeg"))
                .isEqualTo("/api/uploads/social/posts/p1/ig-01.jpg");
        assertThatThrownBy(() -> storage.storeSocialMedia("posts/p1/ig-01.jpg", other, "image/jpeg"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Image already exists with different content");
        assertThat(Files.readAllBytes(root.resolve("social/posts/p1/ig-01.jpg"))).isEqualTo(first);
        try (var files = Files.list(root.resolve("social/posts/p1"))) {
            assertThat(files).hasSize(1);
        }
    }

    @Test
    void deletesObjectsAndIgnoresMissingOnes() {
        storage.storeSocialMedia("posts/p1/ig-01.jpg", jpeg(), "image/jpeg");

        storage.deleteSocialMedia("posts/p1/ig-01.jpg");
        storage.deleteSocialMedia("posts/p1/ig-01.jpg");

        assertThat(root.resolve("social/posts/p1/ig-01.jpg")).doesNotExist();
        assertThat(storage.loadSocialMedia("posts/p1/ig-01.jpg")).isEmpty();
    }

    @Test
    void invalidKeysAndContentNeverTouchTheFilesystem() throws Exception {
        assertThatThrownBy(() -> storage.storeSocialMedia("../avatars/x.jpg", jpeg(), "image/jpeg"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> storage.storeSocialMedia("posts/x.jpg", png(), "image/png"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> storage.storeSocialMedia("posts/x.png", jpeg(), "image/png"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> storage.loadSocialMedia("../avatars/x.jpg"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> storage.deleteSocialMedia("/etc/passwd.png"))
                .isInstanceOf(IllegalArgumentException.class);
        try (var files = Files.walk(root.resolve("social"))) {
            assertThat(files).containsExactly(root.resolve("social"));
        }
        try (var files = Files.list(root.resolve("avatars"))) {
            assertThat(files).isEmpty();
        }
    }
}
