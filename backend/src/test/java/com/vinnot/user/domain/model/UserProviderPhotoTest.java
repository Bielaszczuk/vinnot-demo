package com.vinnot.user.domain.model;

import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

/** #541 S12: the social sign-in photo is stored at 256 px and refreshed while it is still a provider link. */
class UserProviderPhotoTest {

    private static final String GOOGLE_96 = "https://lh3.googleusercontent.com/a/ACg8ocKx=s96-c";
    private static final String GOOGLE_256 = "https://lh3.googleusercontent.com/a/ACg8ocKx=s256-c";

    @Test
    void anEmptyPhotoIsFilledWithTheProviderPhoto() {
        User user = member();

        user.enrichFromIdentityProvider(null, null, "https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=1");

        assertThat(user.getProfileImageUrl()).isEqualTo("https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=1");
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "https://lh3.googleusercontent.com/a/ACg8ocKx=s96-c",
        "https://lh3.googleusercontent.com/a/ACg8ocKx=s96",
        "https://lh5.googleusercontent.com/a/ACg8ocKx=s1024-c"
    })
    void theGooglePhotoIsStoredAt256Pixels(String picture) {
        User user = member();

        user.enrichFromIdentityProvider(null, null, picture);

        assertThat(user.getProfileImageUrl()).endsWith("/a/ACg8ocKx=s256-c");
    }

    @Test
    void aGooglePhotoWithoutASizeSuffixAndOtherProvidersKeepTheirLink() {
        User google = member();
        User facebook = member();

        google.enrichFromIdentityProvider(null, null, "https://lh3.googleusercontent.com/a/ACg8ocKx");
        facebook.enrichFromIdentityProvider(null, null, "https://scontent.xx.fbcdn.net/v/photo.jpg?size=s96-c");

        assertThat(google.getProfileImageUrl()).isEqualTo("https://lh3.googleusercontent.com/a/ACg8ocKx");
        assertThat(facebook.getProfileImageUrl()).isEqualTo("https://scontent.xx.fbcdn.net/v/photo.jpg?size=s96-c");
    }

    @ParameterizedTest
    @ValueSource(strings = {
        GOOGLE_96,
        "https://graph.facebook.com/123/picture?type=large",
        "https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=1",
        "https://scontent.xx.fbcdn.net/v/photo.jpg"
    })
    void aStoredProviderLinkIsRefreshedOnEverySocialSignIn(String stored) {
        User user = member();
        user.updateProfileImage(stored);

        user.enrichFromIdentityProvider(null, null, "https://lh3.googleusercontent.com/a/NewPhoto=s96-c");

        assertThat(user.getProfileImageUrl()).isEqualTo("https://lh3.googleusercontent.com/a/NewPhoto=s256-c");
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "/api/uploads/avatars/avatar_1.webp",
        "https://images.vinnot.com/production/avatars/avatar_1.webp",
        "https://evilgoogleusercontent.com/photo.jpg",
        "https://googleusercontent.com.example.org/photo.jpg",
        "not a url with spaces"
    })
    void anUploadedOrUnknownPhotoIsNeverOverwritten(String stored) {
        User user = member();
        user.updateProfileImage(stored);

        user.enrichFromIdentityProvider(null, null, GOOGLE_96);

        assertThat(user.getProfileImageUrl()).isEqualTo(stored);
    }

    @Test
    void aSignInWithoutAPhotoKeepsTheStoredOne() {
        User apple = member();
        apple.updateProfileImage(GOOGLE_256);
        User blank = member();
        blank.updateProfileImage(GOOGLE_256);

        apple.enrichFromIdentityProvider("Apple", "Member", null);
        blank.enrichFromIdentityProvider(null, null, "  ");

        assertThat(apple.getProfileImageUrl()).isEqualTo(GOOGLE_256);
        assertThat(blank.getProfileImageUrl()).isEqualTo(GOOGLE_256);
    }

    @Test
    void aBlankStoredPhotoCountsAsEmpty() {
        User user = member();
        user.updateProfileImage(" ");

        user.enrichFromIdentityProvider(null, null, GOOGLE_96);

        assertThat(user.getProfileImageUrl()).isEqualTo(GOOGLE_256);
    }

    private static User member() {
        return User.createSocial("vinnoter-abc12345", Email.of("photo@vinnot.com"), Password.fromHash("unusable"),
                "Pho", "To");
    }
}
