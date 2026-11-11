package com.vinnot.shared.infrastructure.storage;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class PublicAvatarUrlResolverTest {

    private static final String UPLOADED = "/api/uploads/avatars/avatar_1.webp";

    @ParameterizedTest
    @ValueSource(strings = {"https://api.vinnot.com/api", "https://api.vinnot.com/api/", "https://api.vinnot.com/api//"})
    void makesAStoredUploadPathAbsoluteWithoutDoublingTheApiSegment(String base) {
        assertThat(new PublicAvatarUrlResolver(base).resolve(UPLOADED))
                .isEqualTo("https://api.vinnot.com/api/uploads/avatars/avatar_1.webp");
    }

    @ParameterizedTest
    @ValueSource(strings = {"https://api.vinnot.com", "https://api.vinnot.com/"})
    void keepsTheApiSegmentOfTheStoredPathWhenTheBaseHasNone(String base) {
        assertThat(new PublicAvatarUrlResolver(base).resolve(UPLOADED))
                .isEqualTo("https://api.vinnot.com/api/uploads/avatars/avatar_1.webp");
    }

    @Test
    void keepsAPathPrefixInFrontOfTheApi() {
        assertThat(new PublicAvatarUrlResolver("https://vinnot.com/backend/api").resolve(UPLOADED))
                .isEqualTo("https://vinnot.com/backend/api/uploads/avatars/avatar_1.webp");
        assertThat(new PublicAvatarUrlResolver("http://localhost:8080/api").resolve("/other/photo.webp"))
                .isEqualTo("http://localhost:8080/api/other/photo.webp");
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "https://images.vinnot.com/production/avatars/a.webp",
        "https://lh3.googleusercontent.com/a/photo=s256-c",
        "http://legacy.example.org/photo.jpg",
        "//cdn.example.org/photo.jpg"
    })
    void leavesAbsoluteLinksUnchanged(String stored) {
        assertThat(new PublicAvatarUrlResolver("https://api.vinnot.com/api").resolve(stored)).isEqualTo(stored);
    }

    @Test
    void turnsAMissingOrBlankPhotoIntoNull() {
        PublicAvatarUrlResolver resolver = new PublicAvatarUrlResolver("https://api.vinnot.com/api");

        assertThat(resolver.resolve(null)).isNull();
        assertThat(resolver.resolve("")).isNull();
        assertThat(resolver.resolve("   ")).isNull();
    }

    @Test
    void leavesTheStoredPathRelativeWhenNoBaseIsConfigured() {
        assertThat(new PublicAvatarUrlResolver("").resolve(UPLOADED)).isEqualTo(UPLOADED);
        assertThat(new PublicAvatarUrlResolver(null).resolve(UPLOADED)).isEqualTo(UPLOADED);
    }
}
