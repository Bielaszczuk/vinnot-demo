package com.vinnot.marketing.application.model;

import com.vinnot.marketing.domain.model.SocialNetwork;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/** #510 S5: grants and claims hide their tokens; a claim knows whether its refresh credential is still alive. */
class SocialAccountModelsTest {
    private static final Instant NOW = Instant.parse("2026-11-04T12:00:00Z");

    @Test
    void grantsAndClaimsNeverPrintTokens() {
        assertThat(new SocialAccountGrant("open-1", "Vinnot", "access-secret", NOW, "refresh-secret", NOW).toString())
                .doesNotContain("access-secret").doesNotContain("refresh-secret").contains("open-1");
        assertThat(new SocialAccountRefreshClaim(SocialNetwork.TIKTOK, NOW, "open-1", "access-secret", NOW, "refresh-secret", NOW).toString())
                .doesNotContain("access-secret").doesNotContain("refresh-secret").contains("open-1");
    }

    @Test
    void aClaimWithARefreshTokenDependsOnItsExpiryOtherwiseOnTheAccessToken() {
        assertThat(new SocialAccountRefreshClaim(SocialNetwork.TIKTOK, NOW, "o", "a", NOW.minusSeconds(1), "r", NOW.plusSeconds(1)).refreshableAt(NOW))
                .isTrue();
        assertThat(new SocialAccountRefreshClaim(SocialNetwork.TIKTOK, NOW, "o", "a", NOW.plusSeconds(1), "r", NOW).refreshableAt(NOW)).isFalse();
        assertThat(new SocialAccountRefreshClaim(SocialNetwork.TIKTOK, NOW, "o", "a", NOW, "r", null).refreshableAt(NOW)).isTrue();
        assertThat(new SocialAccountRefreshClaim(SocialNetwork.THREADS, NOW, "o", "a", NOW.plusSeconds(1), null, null).refreshableAt(NOW)).isTrue();
        assertThat(new SocialAccountRefreshClaim(SocialNetwork.THREADS, NOW, "o", "a", NOW, null, null).refreshableAt(NOW)).isFalse();
    }

    @Test
    void metaSettingsNeedATokenAndTheId() {
        assertThat(new SocialAccountMetaSettings("1784", "1020", true).instagramConfigured()).isTrue();
        assertThat(new SocialAccountMetaSettings("1784", "1020", false).facebookConfigured()).isFalse();
        assertThat(new SocialAccountMetaSettings(null, "", true).facebookConfigured()).isFalse();
        assertThat(new SocialAccountMetaSettings(null, "", true).instagramConfigured()).isFalse();
    }
}
