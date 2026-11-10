package com.vinnot.marketing.infrastructure.config;

import com.vinnot.marketing.application.model.PublishingSettings;
import com.vinnot.marketing.domain.model.SocialNetwork;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Publishing settings from {@code app.marketing.publishing.*} (#510 S9): publishing and every network are off until enabled, and an approved
 * post may wait 6 hours after its slot for its media before it fails. Each network may have a not-before local time in the
 * planner zone (#513 S4, {@code networks.<network>.not-before}); empty means the post time.
 */
@Configuration
public class MarketingPublishingConfiguration {

    @Bean
    PublishingSettings publishingSettings(@Value("${app.marketing.publishing.enabled:false}") boolean enabled,
            @Value("${app.marketing.publishing.networks.instagram.enabled:false}") boolean instagram,
            @Value("${app.marketing.publishing.networks.facebook.enabled:false}") boolean facebook,
            @Value("${app.marketing.publishing.networks.threads.enabled:false}") boolean threads,
            @Value("${app.marketing.publishing.networks.tiktok.enabled:false}") boolean tiktok,
            @Value("${app.marketing.publishing.media-grace:PT6H}") Duration mediaGrace,
            @Value("${app.marketing.planner.zone:America/Argentina/Buenos_Aires}") String zone,
            @Value("${app.marketing.publishing.networks.instagram.not-before:}") String instagramNotBefore,
            @Value("${app.marketing.publishing.networks.facebook.not-before:}") String facebookNotBefore,
            @Value("${app.marketing.publishing.networks.threads.not-before:}") String threadsNotBefore,
            @Value("${app.marketing.publishing.networks.tiktok.not-before:19:30}") String tiktokNotBefore) {
        Set<SocialNetwork> networks = EnumSet.noneOf(SocialNetwork.class);
        if (instagram) {
            networks.add(SocialNetwork.INSTAGRAM);
        }
        if (facebook) {
            networks.add(SocialNetwork.FACEBOOK);
        }
        if (threads) {
            networks.add(SocialNetwork.THREADS);
        }
        if (tiktok) {
            networks.add(SocialNetwork.TIKTOK);
        }
        Map<SocialNetwork, LocalTime> notBefore = new EnumMap<>(SocialNetwork.class);
        putTime(notBefore, SocialNetwork.INSTAGRAM, instagramNotBefore);
        putTime(notBefore, SocialNetwork.FACEBOOK, facebookNotBefore);
        putTime(notBefore, SocialNetwork.THREADS, threadsNotBefore);
        putTime(notBefore, SocialNetwork.TIKTOK, tiktokNotBefore);
        return new PublishingSettings(enabled, networks, mediaGrace, ZoneId.of(zone), notBefore);
    }

    private static void putTime(Map<SocialNetwork, LocalTime> times, SocialNetwork network, String value) {
        if (!value.isBlank()) {
            times.put(network, LocalTime.parse(value.strip()));
        }
    }
}
