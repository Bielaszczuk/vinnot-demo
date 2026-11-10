package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.exception.SocialPublishingException.Code;
import com.vinnot.marketing.application.model.NetworkCaption;
import com.vinnot.marketing.application.model.SocialAccessToken;
import com.vinnot.marketing.application.port.out.SocialAccountTokens;
import com.vinnot.marketing.application.port.out.SocialDraftTracker;
import com.vinnot.marketing.application.port.out.SocialMetricsReader;
import com.vinnot.marketing.application.port.out.SocialPublisher;
import com.vinnot.marketing.domain.model.SocialNetwork;
import org.junit.jupiter.api.Test;
import org.springframework.boot.convert.ApplicationConversionService;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.IMAGES;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.failure;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.request;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SocialNetworksConfigurationTest {

    private final ApplicationContextRunner context = new ApplicationContextRunner()
            .withInitializer(started -> started.getBeanFactory()
                    .setConversionService(ApplicationConversionService.getSharedInstance()))
            .withUserConfiguration(SocialNetworksConfiguration.class)
            .withBean(ObjectMapper.class, ObjectMapper::new);

    @Test
    void registersOnePublisherAndOneReaderPerNetworkWithSafeDefaults() {
        context.run(started -> {
            assertThat(started).hasNotFailed();
            assertThat(started.getBeansOfType(SocialPublisher.class).values()).extracting(SocialPublisher::network)
                    .containsExactlyInAnyOrder(SocialNetwork.values());
            assertThat(started.getBeansOfType(SocialMetricsReader.class).values())
                    .extracting(SocialMetricsReader::network).containsExactlyInAnyOrder(SocialNetwork.values());
            var properties = started.getBean(SocialNetworksProperties.class);
            assertThat(properties.meta().baseUrl()).isEqualTo("https://graph.facebook.com");
            assertThat(properties.meta().version()).isEqualTo("v27.0");
            assertThat(properties.meta().instagramAltText()).isTrue();
            assertThat(properties.meta().instagramMetrics())
                    .containsExactly("views", "reach", "likes", "comments", "saved", "shares");
            assertThat(properties.threads().baseUrl()).isEqualTo("https://graph.threads.com");
            assertThat(properties.threads().version()).isEqualTo("v1.0");
            assertThat(properties.tiktok().baseUrl()).isEqualTo("https://open.tiktokapis.com");
            assertThat(properties.pollInterval()).isEqualTo(Duration.ofSeconds(15));
            assertThat(properties.pollTimeout()).isEqualTo(Duration.ofMinutes(5));
            assertThat(properties.requestTimeout()).isEqualTo(Duration.ofSeconds(30));
            assertThat(properties.connectTimeout()).isEqualTo(Duration.ofSeconds(10));
        });
    }

    @Test
    void withoutAnAccountsAdapterEveryNetworkIsNotConnected() {
        context.run(started -> {
            for (SocialPublisher publisher : started.getBeansOfType(SocialPublisher.class).values()) {
                assertThat(failure(() -> publisher.publish(request(publisher.network(), IMAGES,
                        new NetworkCaption("x", null, List.of(), null))))
                        .code()).isEqualTo(Code.NOT_CONNECTED);
            }
        });
    }

    @Test
    void registersTheTikTokDraftTrackerAsTheOnlyDraftTracker() {
        context.run(started -> {
            assertThat(started.getBeansOfType(SocialDraftTracker.class).values()).extracting(SocialDraftTracker::network)
                    .containsExactly(SocialNetwork.TIKTOK);
            SocialDraftTracker tracker = started.getBean(SocialDraftTracker.class);
            assertThat(failure(() -> tracker.check("p1")).code()).isEqualTo(Code.NOT_CONNECTED);
        });
    }

    @Test
    void usesTheAccountsAdapterWhenThereIsOne() {
        SocialAccountTokens tokens = network -> Optional.of(new SocialAccessToken(" ", "1", null));
        context.withBean(SocialAccountTokens.class, () -> tokens).run(started -> {
            var reader = started.getBean("threadsMetricsReader", SocialMetricsReader.class);
            assertThat(failure(() -> reader.read("t1")).code()).isEqualTo(Code.NOT_CONNECTED);
        });
    }

    @Test
    void bindsOverridesAndTheTikTokMode() {
        context.withPropertyValues("app.marketing.networks.meta.version=v28.0",
                        "app.marketing.networks.meta.instagram-metrics=views,follows",
                        "app.marketing.networks.poll-interval=30s", "app.marketing.networks.poll-timeout=2m",
                        "app.marketing.publishing.tiktok.mode=direct_post")
                .run(started -> {
                    assertThat(started).hasNotFailed();
                    var properties = started.getBean(SocialNetworksProperties.class);
                    assertThat(properties.meta().version()).isEqualTo("v28.0");
                    assertThat(properties.meta().instagramMetrics()).containsExactly("views", "follows");
                    assertThat(properties.pollInterval()).isEqualTo(Duration.ofSeconds(30));
                });
    }

    @Test
    void invalidSettingsFailStartup() {
        context.withPropertyValues("app.marketing.publishing.tiktok.mode=SOMETIMES")
                .run(started -> assertThat(started).hasFailed());
        context.withPropertyValues("app.marketing.networks.poll-interval=10m")
                .run(started -> assertThat(started).hasFailed());
    }

    @Test
    void propertiesRejectInconsistentValues() {
        var meta = new SocialNetworksProperties.Meta(null, null, null, null);
        assertThatThrownBy(() -> new SocialNetworksProperties(meta, null, null, Duration.ofSeconds(40),
                Duration.ofSeconds(30), null, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new SocialNetworksProperties(meta, null, null, null, Duration.ZERO, null, null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new SocialNetworksProperties.Meta(" ", null, null, null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new SocialNetworksProperties.Meta(null, null, List.of(), null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new SocialNetworksProperties.Threads(null, " "))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new SocialNetworksProperties.TikTok(" "))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(Arrays.stream(TikTokPostMode.values()).map(TikTokPostMode::name))
                .containsExactly("MEDIA_UPLOAD", "DIRECT_POST");
        assertThat(TikTokPostMode.parse(" direct_post ")).isEqualTo(TikTokPostMode.DIRECT_POST);
        assertThatThrownBy(() -> TikTokPostMode.parse("x")).isInstanceOf(IllegalArgumentException.class);
    }
}
