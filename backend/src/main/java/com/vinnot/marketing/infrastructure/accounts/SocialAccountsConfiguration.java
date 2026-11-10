package com.vinnot.marketing.infrastructure.accounts;

import com.vinnot.marketing.application.model.SocialAccountMetaSettings;
import com.vinnot.marketing.application.port.out.SocialAccountConnectStates;
import com.vinnot.marketing.application.port.out.SocialAccountStore;
import com.vinnot.marketing.application.port.out.SocialAccountTokens;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.ObjectMapper;

import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;
import java.util.Objects;

/**
 * The connected accounts (#510 S5) from {@code app.marketing.accounts.*}: the token encryption key, the Meta secrets and
 * the Threads and TikTok apps. Every value is empty by default; the application starts without them and the admin page
 * shows each network as not configured.
 */
@Configuration
public class SocialAccountsConfiguration {

    @Bean
    SocialAccountCipher socialAccountCipher(@Value("${app.marketing.accounts.encryption-key:}") String encryptionKey) {
        return new SocialAccountCipher(encryptionKey);
    }

    @Bean
    SocialAccountStore socialAccountStore(JdbcTemplate jdbc, SocialAccountCipher cipher) {
        return new JdbcSocialAccountStore(jdbc, cipher);
    }

    @Bean
    SocialAccountConnectStates socialAccountConnectStates() {
        return new InMemorySocialAccountConnectStates();
    }

    @Bean
    SocialAccountHttp socialAccountHttp(ObjectMapper json,
            @Value("${app.marketing.accounts.http.connect-timeout:5s}") Duration connectTimeout,
            @Value("${app.marketing.accounts.http.read-timeout:15s}") Duration readTimeout) {
        HttpClient client = HttpClient.newBuilder().connectTimeout(connectTimeout).followRedirects(HttpClient.Redirect.NEVER).build();
        return new SocialAccountHttp(client, json, readTimeout);
    }

    @Bean
    ThreadsOAuthProvider threadsOAuthProvider(SocialAccountHttp http,
            @Value("${app.marketing.accounts.threads.client-id:}") String clientId,
            @Value("${app.marketing.accounts.threads.client-secret:}") String clientSecret,
            @Value("${app.marketing.accounts.threads.redirect-uri:}") String redirectUri,
            @Value("${app.marketing.accounts.threads.authorize-url:https://threads.com/oauth/authorize}") String authorizeUrl,
            @Value("${app.marketing.accounts.threads.api-base-url:https://graph.threads.com}") String apiBaseUrl) {
        return new ThreadsOAuthProvider(http, new ThreadsOAuthProvider.Settings(clientId, clientSecret, redirectUri, authorizeUrl, apiBaseUrl),
                Clock.systemUTC());
    }

    @Bean
    TikTokOAuthProvider tikTokOAuthProvider(SocialAccountHttp http,
            @Value("${app.marketing.accounts.tiktok.client-key:}") String clientKey,
            @Value("${app.marketing.accounts.tiktok.client-secret:}") String clientSecret,
            @Value("${app.marketing.accounts.tiktok.redirect-uri:}") String redirectUri,
            @Value("${app.marketing.accounts.tiktok.authorize-url:https://www.tiktok.com/v2/auth/authorize/}") String authorizeUrl,
            @Value("${app.marketing.accounts.tiktok.api-base-url:https://open.tiktokapis.com}") String apiBaseUrl) {
        return new TikTokOAuthProvider(http, new TikTokOAuthProvider.Settings(clientKey, clientSecret, redirectUri, authorizeUrl, apiBaseUrl),
                Clock.systemUTC());
    }

    @Bean
    ConfiguredSocialAccountTokens.MetaSecrets socialAccountMetaSecrets(
            @Value("${app.marketing.accounts.meta.access-token:}") String accessToken,
            @Value("${app.marketing.accounts.meta.instagram-user-id:}") String instagramUserId,
            @Value("${app.marketing.accounts.meta.page-id:}") String pageId,
            @Value("${app.marketing.accounts.meta.page-access-token:}") String pageAccessToken) {
        return new ConfiguredSocialAccountTokens.MetaSecrets(accessToken, instagramUserId, pageId, pageAccessToken);
    }

    @Bean
    SocialAccountMetaSettings socialAccountMetaSettings(ConfiguredSocialAccountTokens.MetaSecrets secrets) {
        boolean tokenConfigured = present(secrets.accessToken());
        boolean pageTokenConfigured = present(secrets.pageAccessToken());
        // The Page can publish with its own configured token even without the system-user token; Instagram cannot.
        return new SocialAccountMetaSettings(tokenConfigured ? secrets.instagramUserId() : null, secrets.pageId(),
                tokenConfigured || pageTokenConfigured);
    }

    @Bean
    SocialAccountTokens socialAccountTokens(ConfiguredSocialAccountTokens.MetaSecrets secrets, SocialAccountStore store, SocialAccountHttp http,
            @Value("${app.marketing.accounts.meta.graph-base-url:https://graph.facebook.com/v27.0}") String graphBaseUrl) {
        return new ConfiguredSocialAccountTokens(secrets, store, new MetaPageTokenClient(http, graphBaseUrl), Clock.systemUTC());
    }

    private static boolean present(String value) {
        return Objects.nonNull(value) && !value.isBlank();
    }
}
