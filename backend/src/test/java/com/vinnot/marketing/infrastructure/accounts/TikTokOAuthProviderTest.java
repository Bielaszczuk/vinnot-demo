package com.vinnot.marketing.infrastructure.accounts;

import com.vinnot.marketing.application.model.SocialAccountGrant;
import com.vinnot.marketing.application.model.SocialAccountRefreshClaim;
import com.vinnot.marketing.application.port.out.SocialAccountOAuthProvider;
import com.vinnot.marketing.domain.model.SocialNetwork;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** #510 S5: TikTok OAuth against a local fake of open.tiktokapis.com: consent URL, code exchange, rotating refresh, failures. */
class TikTokOAuthProviderTest {
    private static final Instant NOW = Instant.parse("2026-11-04T12:00:00Z");
    private static final String TOKENS = "{\"access_token\":\"act.1\",\"expires_in\":86400,\"open_id\":\"open-1\",\"refresh_token\":\"rft.1\","
            + "\"refresh_expires_in\":31536000,\"scope\":\"user.info.basic,video.upload\",\"token_type\":\"Bearer\"}";
    private final FakeNetwork network = new FakeNetwork();
    private final TikTokOAuthProvider provider = provider("key-1", "secret-1", "https://api.vinnot.com/api/public/social-accounts/tiktok/callback");
    private final SocialAccountRefreshClaim claim = new SocialAccountRefreshClaim(SocialNetwork.TIKTOK, NOW.plusSeconds(300), "open-1", "act.0",
            NOW.plusSeconds(600), "rft.0", NOW.plus(Duration.ofDays(100)));

    private TikTokOAuthProvider provider(String key, String secret, String redirect) {
        return new TikTokOAuthProvider(FakeNetwork.http(), new TikTokOAuthProvider.Settings(key, secret, redirect,
                "https://www.tiktok.com/v2/auth/authorize/", network.baseUrl()), Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @AfterEach
    void stop() {
        network.close();
    }

    @Test
    void theConsentUrlAsksForUploadAndPublishWithTheState() {
        URI url = URI.create(provider.authorizeUrl("state-1"));

        assertThat(url.getHost()).isEqualTo("www.tiktok.com");
        assertThat(url.getPath()).isEqualTo("/v2/auth/authorize/");
        assertThat(url.getRawQuery()).isEqualTo("client_key=key-1&scope=user.info.basic%2Cvideo.upload%2Cvideo.publish%2Cvideo.list"
                + "&response_type=code&redirect_uri=https%3A%2F%2Fapi.vinnot.com%2Fapi%2Fpublic%2Fsocial-accounts%2Ftiktok%2Fcallback&state=state-1");
        assertThat(provider.network()).isEqualTo(SocialNetwork.TIKTOK);
        assertThat(provider.refreshLead()).isEqualTo(Duration.ofMinutes(30));
        assertThat(provider.minimumTokenAge()).isZero();
    }

    @Test
    void itIsConfiguredOnlyWithClientKeySecretAndRedirect() {
        assertThat(provider.configured()).isTrue();
        assertThat(provider(null, "secret-1", "https://x").configured()).isFalse();
        assertThat(provider("key-1", "", "https://x").configured()).isFalse();
        assertThat(provider("key-1", "secret-1", null).configured()).isFalse();
    }

    @Test
    void theCodeBecomesTokensWithTheirAnsweredLifetimesAndTheDisplayName() {
        network.answer("/v2/oauth/token/", 200, TOKENS);
        network.answer("/v2/user/info/", 200, "{\"data\":{\"user\":{\"open_id\":\"open-1\",\"display_name\":\"Vinnot\"}},\"error\":{\"code\":\"ok\"}}");

        SocialAccountGrant grant = provider.exchange("code-1");

        assertThat(grant).isEqualTo(new SocialAccountGrant("open-1", "Vinnot", "act.1", NOW.plusSeconds(86_400), "rft.1", NOW.plusSeconds(31_536_000)));
        FakeNetwork.Request exchange = network.request("/v2/oauth/token/");
        assertThat(exchange.method()).isEqualTo("POST");
        assertThat(exchange.form()).containsEntry("client_key", "key-1").containsEntry("client_secret", "secret-1").containsEntry("code", "code-1")
                .containsEntry("grant_type", "authorization_code")
                .containsEntry("redirect_uri", "https://api.vinnot.com/api/public/social-accounts/tiktok/callback");
        FakeNetwork.Request info = network.request("/v2/user/info/");
        assertThat(info.authorization()).isEqualTo("Bearer act.1");
        assertThat(info.query()).containsEntry("fields", "open_id,display_name");
    }

    @Test
    void anUnreadableProfileLeavesTheDisplayNameEmpty() {
        network.answer("/v2/oauth/token/", 200, TOKENS);
        network.answer("/v2/user/info/", 401, "{}");
        assertThat(provider.exchange("code-1").displayName()).isNull();

        network.answer("/v2/user/info/", 200, "{\"data\":{}}");
        assertThat(provider.exchange("code-1").displayName()).isNull();
    }

    @Test
    void aRefreshStoresTheNewRotatedRefreshToken() {
        network.answer("/v2/oauth/token/", 200, TOKENS.replace("act.1", "act.2").replace("rft.1", "rft.2"));

        SocialAccountGrant grant = provider.refresh(claim);

        assertThat(grant).isEqualTo(new SocialAccountGrant("open-1", null, "act.2", NOW.plusSeconds(86_400), "rft.2", NOW.plusSeconds(31_536_000)));
        assertThat(network.request("/v2/oauth/token/").form()).containsEntry("grant_type", "refresh_token").containsEntry("refresh_token", "rft.0")
                .containsEntry("client_key", "key-1").containsEntry("client_secret", "secret-1");
    }

    @Test
    void aRefreshAnsweredForAnotherAccountIsRejected() {
        network.answer("/v2/oauth/token/", 200, TOKENS.replace("open-1", "open-9"));

        assertThatThrownBy(() -> provider.refresh(claim)).isInstanceOfSatisfying(SocialAccountOAuthProvider.Failure.class,
                failure -> assertThat(failure.rejected()).isTrue());
    }

    @Test
    void aRefreshWithoutOpenIdKeepsTheAccount() {
        network.answer("/v2/oauth/token/", 200, TOKENS.replace("\"open_id\":\"open-1\",", ""));

        assertThat(provider.refresh(claim).accountId()).isEqualTo("open-1");
    }

    @Test
    void anAccountWithoutARefreshTokenCannotBeRefreshed() {
        SocialAccountRefreshClaim noRefresh = new SocialAccountRefreshClaim(SocialNetwork.TIKTOK, NOW, "open-1", "act.0", NOW, null, null);

        assertThatThrownBy(() -> provider.refresh(noRefresh)).isInstanceOfSatisfying(SocialAccountOAuthProvider.Failure.class,
                failure -> assertThat(failure.rejected()).isTrue());
        assertThat(network.requests()).isEmpty();
    }

    @Test
    void anInvalidGrantIsARejectionWhetherAsAnErrorStatusOrInTheBody() {
        network.answer("/v2/oauth/token/", 400, "{\"error\":\"invalid_grant\",\"error_description\":\"rft.0 expired\",\"log_id\":\"1\"}");
        assertThatThrownBy(() -> provider.refresh(claim)).isInstanceOfSatisfying(SocialAccountOAuthProvider.Failure.class, failure -> {
            assertThat(failure.rejected()).isTrue();
            assertThat(failure.getMessage()).doesNotContain("rft.0");
        });

        network.answer("/v2/oauth/token/", 200, "{\"error\":\"invalid_grant\",\"error_description\":\"expired\"}");
        assertThatThrownBy(() -> provider.exchange("code-1")).isInstanceOfSatisfying(SocialAccountOAuthProvider.Failure.class,
                failure -> assertThat(failure.rejected()).isTrue());
    }

    @Test
    void anAnswerWithoutLifetimesOrTokensIsUnusable() {
        network.answer("/v2/oauth/token/", 200, TOKENS.replace("\"refresh_expires_in\":31536000", "\"refresh_expires_in\":0"));
        assertThatThrownBy(() -> provider.refresh(claim)).isInstanceOfSatisfying(SocialAccountOAuthProvider.Failure.class,
                failure -> assertThat(failure.rejected()).isFalse());

        network.answer("/v2/oauth/token/", 200, "{}");
        assertThatThrownBy(() -> provider.exchange("code-1")).isInstanceOfSatisfying(SocialAccountOAuthProvider.Failure.class,
                failure -> assertThat(failure.rejected()).isFalse());
    }
}
