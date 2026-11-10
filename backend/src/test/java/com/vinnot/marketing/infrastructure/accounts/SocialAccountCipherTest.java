package com.vinnot.marketing.infrastructure.accounts;

import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** #510 S5: tokens are sealed with AES-GCM bound to their network and field, under the marketing module's own key. */
class SocialAccountCipherTest {
    static final String KEY = Base64.getEncoder().encodeToString(new byte[32]);
    private final SocialAccountCipher cipher = new SocialAccountCipher(KEY);

    @Test
    void aTokenRoundTripsAndIsNeverStoredInTheClear() {
        String sealed = cipher.encrypt("secret-token", "marketing:social-account:TIKTOK:access");

        assertThat(sealed).startsWith("v1:").doesNotContain("secret-token");
        assertThat(cipher.encrypt("secret-token", "marketing:social-account:TIKTOK:access")).isNotEqualTo(sealed);
        assertThat(cipher.decrypt(sealed, "marketing:social-account:TIKTOK:access")).isEqualTo("secret-token");
        assertThat(cipher.available()).isTrue();
    }

    @Test
    void aTokenCannotBeOpenedUnderAnotherNetworkOrField() {
        String sealed = cipher.encrypt("secret-token", "marketing:social-account:TIKTOK:access");

        assertThatThrownBy(() -> cipher.decrypt(sealed, "marketing:social-account:THREADS:access")).isInstanceOf(IllegalStateException.class)
                .hasMessageNotContaining("secret-token");
        assertThatThrownBy(() -> cipher.decrypt(sealed, "marketing:social-account:TIKTOK:refresh")).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void anotherKeyCannotOpenIt() {
        String sealed = cipher.encrypt("secret-token", "ctx");
        byte[] other = new byte[32];
        other[0] = 1;

        assertThatThrownBy(() -> new SocialAccountCipher(Base64.getEncoder().encodeToString(other)).decrypt(sealed, "ctx"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void malformedEnvelopesAreRefused() {
        assertThatThrownBy(() -> cipher.decrypt("v2:abc", "ctx")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> cipher.decrypt("v1:%%%", "ctx")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> cipher.decrypt("v1:" + Base64.getEncoder().encodeToString(new byte[20]), "ctx"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void withoutAKeyTheApplicationStartsButNothingIsEncrypted() {
        SocialAccountCipher absent = new SocialAccountCipher(" ");

        assertThat(absent.available()).isFalse();
        assertThat(new SocialAccountCipher(null).available()).isFalse();
        assertThatThrownBy(() -> absent.encrypt("secret-token", "ctx")).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("MARKETING_ACCOUNTS_ENCRYPTION_KEY");
        assertThatThrownBy(() -> absent.decrypt(cipher.encrypt("secret-token", "ctx"), "ctx")).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void aMalformedKeyStopsStartupWithoutEchoingIt() {
        assertThatThrownBy(() -> new SocialAccountCipher("not base64 !")).isInstanceOf(IllegalArgumentException.class)
                .hasMessageNotContaining("not base64");
        assertThatThrownBy(() -> new SocialAccountCipher(Base64.getEncoder().encodeToString(new byte[16])))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("32 random bytes");
    }
}
