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

/** #510 S5: Threads OAuth against a local fake of graph.threads.com: consent URL, code to 60-day token, refresh, failures. */
class ThreadsOAuthProviderTest {
    private static final Instant NOW = Instant.parse("2026-11-04T12:00:00Z");
    private static final long SIXTY_DAYS = 5_184_000L;
    private final FakeNetwork network = new FakeNetwork();
    private final ThreadsOAuthProvider provider = provider("client-1", "secret-1", "https://api.vinnot.com/api/public/social-accounts/threads/callback");

    private ThreadsOAuthProvider provider(String clientId, String secret, String redirect) {
        return new ThreadsOAuthProvider(FakeNetwork.http(), new ThreadsOAuthProvider.Settings(clientId, secret, redirect,
                "https://threads.com/oauth/authorize", network.baseUrl()), Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @AfterEach
    void stop() {
        network.close();
    }

    @Test
    void theConsentUrlAsksForPublishingAndInsightsWithTheState() {
        URI url = URI.create(provider.authorizeUrl("st/ate+1"));

        assertThat(url.getHost()).isEqualTo("threads.com");
        assertThat(url.getPath()).isEqualTo("/oauth/authorize");
        assertThat(url.getRawQuery()).isEqualTo("client_id=client-1&redirect_uri=https%3A%2F%2Fapi.vinnot.com%2Fapi%2Fpublic%2Fsocial-accounts"
                + "%2Fthreads%2Fcallback&scope=threads_basic%2Cthreads_content_publish%2Cthreads_manage_insights&response_type=code&state=st%2Fate%2B1");
        assertThat(provider.network()).isEqualTo(SocialNetwork.THREADS);
        assertThat(provider.refreshLead()).isEqualTo(Duration.ofDays(10));
        assertThat(provider.minimumTokenAge()).isEqualTo(Duration.ofHours(24));
    }

    @Test
    void itIsConfiguredOnlyWithClientIdSecretAndRedirect() {
        assertThat(provider.configured()).isTrue();
        assertThat(provider("", "secret-1", "https://x").configured()).isFalse();
        assertThat(provider("client-1", null, "https://x").configured()).isFalse();
        assertThat(provider("client-1", "secret-1", " ").configured()).isFalse();
    }

    @Test
    void theCodeBecomesALongLivedTokenWithTheUserAndUsername() {
        network.answer("/oauth/access_token", 200, "{\"access_token\":\"short-1\",\"token_type\":\"bearer\",\"user_id\":17841400000000001}");
        network.answer("/access_token", 200, "{\"access_token\":\"long-1\",\"token_type\":\"bearer\",\"expires_in\":" + SIXTY_DAYS + "}");
        network.answer("/v1.0/me", 200, "{\"id\":\"17841400000000001\",\"username\":\"vinnot.app\"}");

        SocialAccountGrant grant = provider.exchange("code-1#_");

        assertThat(grant).isEqualTo(new SocialAccountGrant("17841400000000001", "vinnot.app", "long-1", NOW.plusSeconds(SIXTY_DAYS), null, null));
        FakeNetwork.Request exchange = network.request("/oauth/access_token");
        assertThat(exchange.method()).isEqualTo("POST");
        assertThat(exchange.contentType()).isEqualTo("application/x-www-form-urlencoded");
        assertThat(exchange.form()).containsEntry("client_id", "client-1").containsEntry("client_secret", "secret-1")
                .containsEntry("grant_type", "authorization_code").containsEntry("code", "code-1")
                .containsEntry("redirect_uri", "https://api.vinnot.com/api/public/social-accounts/threads/callback");
        assertThat(network.request("/access_token").query()).containsEntry("grant_type", "th_exchange_token")
                .containsEntry("client_secret", "secret-1").containsEntry("access_token", "short-1");
        assertThat(network.request("/v1.0/me").query()).containsEntry("fields", "id,username").containsEntry("access_token", "long-1");
    }

    @Test
    void aMissingUsernameDoesNotFailTheConnection() {
        network.answer("/oauth/access_token", 200, "{\"access_token\":\"short-1\",\"user_id\":\"42\"}");
        network.answer("/access_token", 200, "{\"access_token\":\"long-1\",\"expires_in\":" + SIXTY_DAYS + "}");
        network.answer("/v1.0/me", 500, "{}");

        assertThat(provider.exchange("code-1").displayName()).isNull();

        network.answer("/v1.0/me", 200, "{\"id\":\"42\"}");
        assertThat(provider.exchange("code-1").displayName()).isNull();
    }

    @Test
    void aRefusedCodeIsARejectionWithoutTheBody() {
        network.answer("/oauth/access_token", 400, "{\"error_message\":\"secret-detail short-1\",\"code\":1}");

        assertThatThrownBy(() -> provider.exchange("code-1")).isInstanceOfSatisfying(SocialAccountOAuthProvider.Failure.class, failure -> {
            assertThat(failure.rejected()).isTrue();
            assertThat(failure.getMessage()).doesNotContain("secret-detail").doesNotContain("code-1");
        });
    }

    @Test
    void anAnswerWithoutTheLifetimeIsUnusable() {
        network.answer("/oauth/access_token", 200, "{\"access_token\":\"short-1\",\"user_id\":\"42\"}");
        network.answer("/access_token", 200, "{\"access_token\":\"long-1\"}");

        assertThatThrownBy(() -> provider.exchange("code-1")).isInstanceOfSatisfying(SocialAccountOAuthProvider.Failure.class,
                failure -> assertThat(failure.rejected()).isFalse());
        network.answer("/oauth/access_token", 200, "{\"access_token\":\"short-1\"}");
        assertThatThrownBy(() -> provider.exchange("code-1")).isInstanceOf(SocialAccountOAuthProvider.Failure.class);
    }

    @Test
    void aRefreshRenewsTheTokenForAnotherSixtyDays() {
        network.answer("/refresh_access_token", 200, "{\"access_token\":\"long-2\",\"token_type\":\"bearer\",\"expires_in\":" + SIXTY_DAYS + "}");
        SocialAccountRefreshClaim claim = new SocialAccountRefreshClaim(SocialNetwork.THREADS, NOW.plusSeconds(300), "42", "long-1",
                NOW.plus(Duration.ofDays(5)), null, null);

        assertThat(provider.refresh(claim)).isEqualTo(new SocialAccountGrant("42", null, "long-2", NOW.plusSeconds(SIXTY_DAYS), null, null));
        assertThat(network.request("/refresh_access_token").query()).containsEntry("grant_type", "th_refresh_token")
                .containsEntry("access_token", "long-1");
    }

    @Test
    void rateLimitsAndServerErrorsAreTransient() {
        SocialAccountRefreshClaim claim = new SocialAccountRefreshClaim(SocialNetwork.THREADS, NOW.plusSeconds(300), "42", "long-1",
                NOW.plus(Duration.ofDays(5)), null, null);
        network.answer("/refresh_access_token", 429, "{}");
        assertThatThrownBy(() -> provider.refresh(claim)).isInstanceOfSatisfying(SocialAccountOAuthProvider.Failure.class,
                failure -> assertThat(failure.code()).isEqualTo(SocialAccountOAuthProvider.Failure.UNAVAILABLE));
        network.answer("/refresh_access_token", 503, "{}");
        assertThatThrownBy(() -> provider.refresh(claim)).isInstanceOfSatisfying(SocialAccountOAuthProvider.Failure.class,
                failure -> assertThat(failure.rejected()).isFalse());
        network.answer("/refresh_access_token", 200, "not json");
        assertThatThrownBy(() -> provider.refresh(claim)).isInstanceOfSatisfying(SocialAccountOAuthProvider.Failure.class,
                failure -> assertThat(failure.rejected()).isFalse());
        network.answer("/refresh_access_token", 401, "{}");
        assertThatThrownBy(() -> provider.refresh(claim)).isInstanceOfSatisfying(SocialAccountOAuthProvider.Failure.class,
                failure -> assertThat(failure.code()).isEqualTo(SocialAccountOAuthProvider.Failure.REJECTED));
    }

    @Test
    void anUnreachableNetworkIsTransient() {
        network.close();

        assertThatThrownBy(() -> provider.exchange("code-1")).isInstanceOfSatisfying(SocialAccountOAuthProvider.Failure.class,
                failure -> assertThat(failure.rejected()).isFalse());
    }
}
