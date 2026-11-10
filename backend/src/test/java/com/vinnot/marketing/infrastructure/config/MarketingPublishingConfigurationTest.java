package com.vinnot.marketing.infrastructure.config;

import com.vinnot.marketing.application.model.PublishingSettings;
import com.vinnot.marketing.domain.model.SocialNetwork;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * #510 S9: publishing and every network stay off until enabled, and the enabled ones publish in network order. #513 S4: each
 * network may have a not-before time in the planner zone, empty meaning the post time.
 */
class MarketingPublishingConfigurationTest {
    private static final String ARGENTINA = "America/Argentina/Buenos_Aires";
    /** Tuesday 2026-11-03 at 12:30 in Argentina. */
    private static final Instant NOON_POST = Instant.parse("2026-11-03T15:30:00Z");
    private final MarketingPublishingConfiguration configuration = new MarketingPublishingConfiguration();

    @Test
    void noNetworkIsEnabledByDefault() {
        PublishingSettings settings = settings(false, false, false, false, false, Duration.ofHours(6));

        assertThat(settings.enabled()).isFalse();
        assertThat(settings.networks()).isEmpty();
        assertThat(settings.publishes(SocialNetwork.INSTAGRAM)).isFalse();
        assertThat(settings.mediaGrace()).isEqualTo(Duration.ofHours(6));
    }

    @Test
    void enabledNetworksAreListedInNetworkOrder() {
        assertThat(settings(true, true, true, true, true, Duration.ofHours(1)).networks())
                .containsExactly(SocialNetwork.INSTAGRAM, SocialNetwork.FACEBOOK, SocialNetwork.THREADS, SocialNetwork.TIKTOK);
        assertThat(settings(false, false, true, false, true, Duration.ofHours(1)).networks())
                .containsExactly(SocialNetwork.FACEBOOK, SocialNetwork.TIKTOK);
    }

    @Test
    void aNetworkPublishesOnlyWhilePublishingAndTheNetworkAreBothOn() {
        PublishingSettings on = settings(true, true, false, false, false, Duration.ofHours(6));
        PublishingSettings off = settings(false, true, false, false, false, Duration.ofHours(6));

        assertThat(on.publishes(SocialNetwork.INSTAGRAM)).isTrue();
        assertThat(on.publishes(SocialNetwork.FACEBOOK)).as("network off").isFalse();
        assertThat(off.publishes(SocialNetwork.INSTAGRAM)).as("publishing off").isFalse();
        assertThat(off.networks()).containsExactly(SocialNetwork.INSTAGRAM);
    }

    @Test
    void aNetworkWithANotBeforeTimePublishesAtItOnThePostsDayWhenItIsLater() {
        PublishingSettings settings = configuration.publishingSettings(true, true, true, true, true, Duration.ofHours(6), ARGENTINA, "",
                " ", "", "19:30");

        assertThat(settings.notBefore()).containsExactly(Map.entry(SocialNetwork.TIKTOK, LocalTime.of(19, 30)));
        assertThat(settings.zone()).isEqualTo(ZoneId.of(ARGENTINA));
        assertThat(settings.publishAt(SocialNetwork.TIKTOK, NOON_POST)).isEqualTo(Instant.parse("2026-11-03T22:30:00Z"));
        assertThat(settings.publishAt(SocialNetwork.INSTAGRAM, NOON_POST)).as("empty: the post time").isEqualTo(NOON_POST);
        Instant nightPost = Instant.parse("2026-11-03T23:00:00Z");
        assertThat(settings.publishAt(SocialNetwork.TIKTOK, nightPost)).as("a post after 19:30 keeps its own time").isEqualTo(nightPost);
        assertThat(settings.delay(SocialNetwork.TIKTOK, NOON_POST, NOON_POST.plusSeconds(60))).isEqualTo(Duration.ofMinutes(419));
        assertThat(settings.delay(SocialNetwork.TIKTOK, NOON_POST, Instant.parse("2026-11-03T23:00:00Z"))).isZero();
        assertThat(settings.delay(SocialNetwork.FACEBOOK, NOON_POST, NOON_POST.plusSeconds(60))).isZero();
    }

    @Test
    void withoutNotBeforeTimesEveryNetworkPublishesAtThePostTime() {
        PublishingSettings settings = settings(true, true, true, true, true, Duration.ofHours(6));

        assertThat(settings.notBefore()).isEmpty();
        for (SocialNetwork network : SocialNetwork.values()) {
            assertThat(settings.publishAt(network, NOON_POST)).isEqualTo(NOON_POST);
        }
    }

    private PublishingSettings settings(boolean enabled, boolean instagram, boolean facebook, boolean threads, boolean tiktok,
            Duration mediaGrace) {
        return configuration.publishingSettings(enabled, instagram, facebook, threads, tiktok, mediaGrace, ARGENTINA, "", "", "", "");
    }
}
