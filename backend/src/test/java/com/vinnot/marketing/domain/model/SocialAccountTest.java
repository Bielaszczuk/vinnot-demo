package com.vinnot.marketing.domain.model;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** #510 S5: a connected account publishes only while connected and unexpired, and its text never shows a token. */
class SocialAccountTest {
    private static final Instant NOW = Instant.parse("2026-11-04T12:00:00Z");

    private SocialAccount account(SocialAccountStatus status, Instant accessEnd) {
        return new SocialAccount(SocialNetwork.TIKTOK, "open-1", "Vinnot", "access-secret", "refresh-secret", accessEnd, null, status, null,
                UUID.randomUUID(), NOW, NOW);
    }

    @Test
    void itIsUsableOnlyWhileConnectedAndUnexpired() {
        assertThat(account(SocialAccountStatus.CONNECTED, NOW.plusSeconds(1)).usableAt(NOW)).isTrue();
        assertThat(account(SocialAccountStatus.CONNECTED, null).usableAt(NOW)).isTrue();
        assertThat(account(SocialAccountStatus.CONNECTED, NOW).usableAt(NOW)).isFalse();
        assertThat(account(SocialAccountStatus.REFRESH_FAILED, NOW.plusSeconds(60)).usableAt(NOW)).isFalse();
    }

    @Test
    void itsTextHidesTheTokens() {
        assertThat(account(SocialAccountStatus.CONNECTED, NOW).toString()).doesNotContain("access-secret").doesNotContain("refresh-secret")
                .contains("open-1");
    }

    @Test
    void itNeedsTheNetworkAccountTokenAndStatus() {
        assertThatThrownBy(() -> new SocialAccount(SocialNetwork.TIKTOK, "open-1", null, null, null, null, null, SocialAccountStatus.CONNECTED,
                null, null, NOW, NOW)).isInstanceOf(NullPointerException.class);
    }
}
