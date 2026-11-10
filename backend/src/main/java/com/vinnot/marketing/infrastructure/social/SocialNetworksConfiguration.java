package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.model.SocialAccessToken;
import com.vinnot.marketing.application.port.out.SocialAccountTokens;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.ObjectMapper;

import java.net.http.HttpClient;
import java.time.Clock;
import java.util.Objects;
import java.util.Optional;

/**
 * The network adapters (#510): one publisher and one metrics reader per network, plus the TikTok draft tracker (#516),
 * sharing one bounded HTTP client.
 * They are passive; whether anything is published is decided by {@code app.marketing.publishing.*}. Tokens are looked
 * up on every call through {@link SocialAccountTokens}; without that adapter every network reads as not connected.
 */
@Configuration
@EnableConfigurationProperties(SocialNetworksProperties.class)
public class SocialNetworksConfiguration {

    private final Clock clock = Clock.systemUTC();

    @Bean
    SocialHttpTransport socialNetworksHttpTransport(ObjectMapper objectMapper, SocialNetworksProperties properties) {
        HttpClient client = HttpClient.newBuilder().connectTimeout(properties.connectTimeout())
                .followRedirects(HttpClient.Redirect.NEVER).build();
        return new SocialHttpTransport(client, objectMapper, properties.requestTimeout());
    }

    @Bean
    StatusPoller socialNetworksStatusPoller(SocialNetworksProperties properties) {
        return new StatusPoller(clock, duration -> Thread.sleep(duration), properties.pollInterval(),
                properties.pollTimeout());
    }

    @Bean
    InstagramPublisher instagramPublisher(SocialHttpTransport http, SocialNetworksProperties properties,
            StatusPoller poller, ObjectProvider<SocialAccountTokens> tokens) {
        return new InstagramPublisher(meta(http, properties), lazy(tokens), poller, clock,
                properties.meta().instagramAltText());
    }

    @Bean
    InstagramMetricsReader instagramMetricsReader(SocialHttpTransport http, SocialNetworksProperties properties,
            ObjectProvider<SocialAccountTokens> tokens) {
        return new InstagramMetricsReader(meta(http, properties), lazy(tokens), clock,
                properties.meta().instagramMetrics());
    }

    @Bean
    FacebookPublisher facebookPublisher(SocialHttpTransport http, SocialNetworksProperties properties,
            ObjectProvider<SocialAccountTokens> tokens, ObjectMapper objectMapper) {
        return new FacebookPublisher(meta(http, properties), lazy(tokens), clock, objectMapper);
    }

    @Bean
    FacebookMetricsReader facebookMetricsReader(SocialHttpTransport http, SocialNetworksProperties properties,
            ObjectProvider<SocialAccountTokens> tokens) {
        return new FacebookMetricsReader(meta(http, properties), lazy(tokens), clock);
    }

    @Bean
    ThreadsPublisher threadsPublisher(SocialHttpTransport http, SocialNetworksProperties properties,
            StatusPoller poller, ObjectProvider<SocialAccountTokens> tokens) {
        return new ThreadsPublisher(threads(http, properties), lazy(tokens), poller, clock);
    }

    @Bean
    ThreadsMetricsReader threadsMetricsReader(SocialHttpTransport http, SocialNetworksProperties properties,
            ObjectProvider<SocialAccountTokens> tokens) {
        return new ThreadsMetricsReader(threads(http, properties), lazy(tokens), clock);
    }

    @Bean
    TikTokPublisher tiktokPublisher(SocialHttpTransport http, SocialNetworksProperties properties, StatusPoller poller,
            ObjectProvider<SocialAccountTokens> tokens,
            @Value("${app.marketing.publishing.tiktok.mode:MEDIA_UPLOAD}") String mode) {
        return new TikTokPublisher(new TikTokApi(http, properties.tiktok().baseUrl()), lazy(tokens), poller, clock,
                TikTokPostMode.parse(mode));
    }

    @Bean
    TikTokDraftTracker tiktokDraftTracker(SocialHttpTransport http, SocialNetworksProperties properties,
            ObjectProvider<SocialAccountTokens> tokens) {
        return new TikTokDraftTracker(new TikTokApi(http, properties.tiktok().baseUrl()), lazy(tokens), clock);
    }

    @Bean
    TikTokMetricsReader tiktokMetricsReader() {
        return new TikTokMetricsReader();
    }

    private static GraphApi meta(SocialHttpTransport http, SocialNetworksProperties properties) {
        return new GraphApi(http, properties.meta().baseUrl(), properties.meta().version());
    }

    private static GraphApi threads(SocialHttpTransport http, SocialNetworksProperties properties) {
        return new GraphApi(http, properties.threads().baseUrl(), properties.threads().version());
    }

    /** Resolved on every call, so the adapters start even before (or without) the accounts adapter. */
    private static SocialAccountTokens lazy(ObjectProvider<SocialAccountTokens> provider) {
        return network -> {
            SocialAccountTokens tokens = provider.getIfAvailable();
            return Objects.isNull(tokens) ? Optional.<SocialAccessToken>empty() : tokens.tokenFor(network);
        };
    }
}
