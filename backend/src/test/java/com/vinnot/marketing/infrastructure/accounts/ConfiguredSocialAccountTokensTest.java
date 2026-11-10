package com.vinnot.marketing.infrastructure.accounts;

import com.vinnot.marketing.application.model.SocialAccessToken;
import com.vinnot.marketing.application.port.out.SocialAccountOAuthProvider;
import com.vinnot.marketing.application.port.out.SocialAccountStore;
import com.vinnot.marketing.domain.model.SocialAccount;
import com.vinnot.marketing.domain.model.SocialAccountStatus;
import com.vinnot.marketing.domain.model.SocialNetwork;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** #510 S5 C2: Meta tokens come from configuration (the Page token read and cached), Threads and TikTok from the store. */
class ConfiguredSocialAccountTokensTest {
    private static final Instant NOW = Instant.parse("2026-11-04T12:00:00Z");
    private final SocialAccountStore store = mock(SocialAccountStore.class);
    private final MetaPageTokenClient pages = mock(MetaPageTokenClient.class);
    private final MutableClock clock = new MutableClock(NOW);
    private final ConfiguredSocialAccountTokens.MetaSecrets meta = new ConfiguredSocialAccountTokens.MetaSecrets("system-token", "1784", "1020", null);

    private ConfiguredSocialAccountTokens tokens(ConfiguredSocialAccountTokens.MetaSecrets secrets) {
        return new ConfiguredSocialAccountTokens(secrets, store, pages, clock);
    }

    private SocialAccount account(SocialNetwork network, SocialAccountStatus status, Instant accessEnd) {
        return new SocialAccount(network, "acct-1", "name", "access-1", "refresh-1", accessEnd, null, status, null, UUID.randomUUID(), NOW, NOW);
    }

    @Test
    void instagramUsesTheSystemUserTokenThatNeverExpires() {
        assertThat(tokens(meta).tokenFor(SocialNetwork.INSTAGRAM)).contains(new SocialAccessToken("system-token", "1784", null));
        assertThat(tokens(new ConfiguredSocialAccountTokens.MetaSecrets("system-token", " ", "1020", null)).tokenFor(SocialNetwork.INSTAGRAM)).isEmpty();
        assertThat(tokens(new ConfiguredSocialAccountTokens.MetaSecrets(null, "1784", "1020", null)).tokenFor(SocialNetwork.INSTAGRAM)).isEmpty();
    }

    @Test
    void facebookPrefersAConfiguredPageToken() {
        ConfiguredSocialAccountTokens tokens = tokens(new ConfiguredSocialAccountTokens.MetaSecrets("", null, "1020", "page-configured"));

        assertThat(tokens.tokenFor(SocialNetwork.FACEBOOK)).contains(new SocialAccessToken("page-configured", "1020", null));
        verify(pages, never()).pageToken(any(), any());
    }

    @Test
    void facebookReadsThePageTokenOnceAnHourAndReadsAgainAfterAFailure() {
        when(pages.pageToken("system-token", "1020")).thenThrow(new SocialAccountOAuthProvider.Failure(false, "down")).thenReturn("page-1", "page-2");
        ConfiguredSocialAccountTokens tokens = tokens(meta);

        assertThat(tokens.tokenFor(SocialNetwork.FACEBOOK)).isEmpty();
        assertThat(tokens.tokenFor(SocialNetwork.FACEBOOK)).contains(new SocialAccessToken("page-1", "1020", null));
        assertThat(tokens.tokenFor(SocialNetwork.FACEBOOK)).contains(new SocialAccessToken("page-1", "1020", null));
        clock.now = NOW.plus(ConfiguredSocialAccountTokens.PAGE_TOKEN_TTL);
        assertThat(tokens.tokenFor(SocialNetwork.FACEBOOK)).contains(new SocialAccessToken("page-2", "1020", null));

        verify(pages, times(3)).pageToken("system-token", "1020");
    }

    @Test
    void facebookNeedsThePageIdAndAToken() {
        assertThat(tokens(new ConfiguredSocialAccountTokens.MetaSecrets("system-token", "1784", null, "page")).tokenFor(SocialNetwork.FACEBOOK)).isEmpty();
        assertThat(tokens(new ConfiguredSocialAccountTokens.MetaSecrets(" ", "1784", "1020", null)).tokenFor(SocialNetwork.FACEBOOK)).isEmpty();
        verify(pages, never()).pageToken(any(), any());
    }

    @Test
    void threadsAndTikTokUseTheStoredAccountWhileItIsConnectedAndUnexpired() {
        when(store.find(SocialNetwork.THREADS)).thenReturn(Optional.of(account(SocialNetwork.THREADS, SocialAccountStatus.CONNECTED,
                NOW.plusSeconds(60))));
        when(store.find(SocialNetwork.TIKTOK)).thenReturn(Optional.of(account(SocialNetwork.TIKTOK, SocialAccountStatus.CONNECTED,
                NOW.plusSeconds(60))));

        assertThat(tokens(meta).tokenFor(SocialNetwork.THREADS)).contains(new SocialAccessToken("access-1", "acct-1", NOW.plusSeconds(60)));
        assertThat(tokens(meta).tokenFor(SocialNetwork.TIKTOK)).contains(new SocialAccessToken("access-1", "acct-1", NOW.plusSeconds(60)));
    }

    @Test
    void anExpiredFailedMissingOrUnreadableAccountIsNotConnected() {
        ConfiguredSocialAccountTokens tokens = tokens(meta);
        when(store.find(SocialNetwork.THREADS)).thenReturn(Optional.of(account(SocialNetwork.THREADS, SocialAccountStatus.CONNECTED, NOW)));
        assertThat(tokens.tokenFor(SocialNetwork.THREADS)).isEmpty();

        when(store.find(SocialNetwork.THREADS)).thenReturn(Optional.of(account(SocialNetwork.THREADS, SocialAccountStatus.REFRESH_FAILED,
                NOW.plusSeconds(60))));
        assertThat(tokens.tokenFor(SocialNetwork.THREADS)).isEmpty();

        when(store.find(SocialNetwork.TIKTOK)).thenReturn(Optional.empty());
        assertThat(tokens.tokenFor(SocialNetwork.TIKTOK)).isEmpty();

        when(store.find(SocialNetwork.TIKTOK)).thenThrow(new IllegalStateException("Social account token encryption failed"));
        assertThat(tokens.tokenFor(SocialNetwork.TIKTOK)).isEmpty();
    }

    @Test
    void theSecretsTextHidesTheTokens() {
        assertThat(new ConfiguredSocialAccountTokens.MetaSecrets("system-token", "1784", "1020", "page-token").toString())
                .doesNotContain("system-token").doesNotContain("page-token").contains("1784");
    }

    private static final class MutableClock extends Clock {
        private Instant now;

        private MutableClock(Instant now) {
            this.now = now;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
