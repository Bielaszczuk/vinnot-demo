package com.vinnot.marketing.infrastructure.scheduling;

import com.vinnot.marketing.application.port.in.SyncSocialDraftsUseCase;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * The TikTok draft sweep (#516 S1), every {@code app.marketing.publishing.draft-sync.delay-ms} (15 minutes by default).
 * It runs with the same switches as the publishing sweep: the social media agent and publishing both enabled.
 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.marketing.enabled", havingValue = "true", matchIfMissing = true)
@ConditionalOnProperty(name = "app.marketing.publishing.enabled", havingValue = "true")
public class SocialDraftSyncScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(SocialDraftSyncScheduler.class);
    private final SyncSocialDraftsUseCase drafts;

    @Scheduled(initialDelayString = "${app.marketing.publishing.draft-sync.initial-delay-ms:120000}",
            fixedDelayString = "${app.marketing.publishing.draft-sync.delay-ms:900000}")
    public void syncDrafts() {
        int posted = drafts.syncDrafts(Instant.now());
        if (posted > 0) {
            LOGGER.info("Marked {} posted social draft(s) as published", posted);
        }
    }
}
