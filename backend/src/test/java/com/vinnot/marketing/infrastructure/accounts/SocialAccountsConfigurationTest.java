package com.vinnot.marketing.infrastructure.accounts;

import com.vinnot.marketing.application.model.SocialAccountMetaSettings;
import com.vinnot.marketing.domain.model.SocialNetwork;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/** #510 S5: with every account value empty the beans still build; nothing is configured or connectable. */
class SocialAccountsConfigurationTest {
    private final SocialAccountsConfiguration configuration = new SocialAccountsConfiguration();

    @Test
    void emptyConfigurationStartsWithNothingConfigured() {
        SocialAccountCipher cipher = configuration.socialAccountCipher("");
        SocialAccountHttp http = configuration.socialAccountHttp(new ObjectMapper(), Duration.ofSeconds(1), Duration.ofSeconds(1));
        ConfiguredSocialAccountTokens.MetaSecrets secrets = configuration.socialAccountMetaSecrets("", "", "", "");

        assertThat(configuration.socialAccountStore(mock(JdbcTemplate.class), cipher).encryptionReady()).isFalse();
        assertThat(configuration.threadsOAuthProvider(http, "", "", "", "https://threads.com/oauth/authorize", "https://graph.threads.com")
                .configured()).isFalse();
        assertThat(configuration.tikTokOAuthProvider(http, "", "", "", "https://www.tiktok.com/v2/auth/authorize/", "https://open.tiktokapis.com")
                .configured()).isFalse();
        SocialAccountMetaSettings meta = configuration.socialAccountMetaSettings(secrets);
        assertThat(meta.instagramConfigured()).isFalse();
        assertThat(meta.facebookConfigured()).isFalse();
        assertThat(configuration.socialAccountTokens(secrets, configuration.socialAccountStore(mock(JdbcTemplate.class), cipher), http,
                "https://graph.facebook.com/v27.0").tokenFor(SocialNetwork.INSTAGRAM)).isEmpty();
        assertThat(configuration.socialAccountConnectStates()).isInstanceOf(InMemorySocialAccountConnectStates.class);
    }

    @Test
    void metaSettingsExposeIdsButOnlyWhetherATokenIsSet() {
        SocialAccountMetaSettings full = configuration.socialAccountMetaSettings(
                configuration.socialAccountMetaSecrets("system-token", "1784", "1020", ""));
        assertThat(full).isEqualTo(new SocialAccountMetaSettings("1784", "1020", true));

        SocialAccountMetaSettings pageOnly = configuration.socialAccountMetaSettings(
                configuration.socialAccountMetaSecrets("", "1784", "1020", "page-token"));
        assertThat(pageOnly.facebookConfigured()).isTrue();
        assertThat(pageOnly.instagramConfigured()).isFalse();
    }
}
