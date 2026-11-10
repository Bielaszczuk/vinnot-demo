package com.vinnot.marketing.infrastructure.scheduling;

import com.vinnot.marketing.application.port.in.StartSocialPublishingUseCase;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * The publishing sweep (#510 S2), every {@code app.marketing.publishing.delay-ms} (5 minutes by default). It runs only
 * with the social media agent and publishing both enabled; publishing is off by default (S9).
 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.marketing.enabled", havingValue = "true", matchIfMissing = true)
@ConditionalOnProperty(name = "app.marketing.publishing.enabled", havingValue = "true")
public class SocialPublishingScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(SocialPublishingScheduler.class);
    private final StartSocialPublishingUseCase publishing;

    @Scheduled(initialDelayString = "${app.marketing.publishing.initial-delay-ms:60000}",
            fixedDelayString = "${app.marketing.publishing.delay-ms:300000}")
    public void startDue() {
        int started = publishing.startDue(Instant.now());
        if (started > 0) {
            LOGGER.info("Started publishing {} social post(s)", started);
        }
    }
}
