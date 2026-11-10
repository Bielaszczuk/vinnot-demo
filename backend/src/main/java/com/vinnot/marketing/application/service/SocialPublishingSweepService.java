package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.PublishingSettings;
import com.vinnot.marketing.application.port.in.StartSocialPublishingUseCase;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.domain.model.SocialPost;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * The publishing sweep (#510 S2): each due approved post starts in its own transaction, so one failure never holds back
 * the others; a failed one is tried again by the next sweep. While no network is enabled nothing is read or started. Only
 * posts whose slot is at most {@value #WINDOW_GRACES} media graces ago are due: inside that window a post with ready media
 * starts and one still without media fails once its grace ended, while older approved posts (approved posts whose slot
 * passed stay approved since #489) are left alone silently, so switching publishing on never publishes a stale backlog.
 */
@Service
@RequiredArgsConstructor
public class SocialPublishingSweepService implements StartSocialPublishingUseCase {
    /** Due posts started per sweep; more wait for the next one. */
    static final int BATCH = 50;
    /** How many media graces after its slot an approved post is still due; past that it is never published. */
    static final int WINDOW_GRACES = 2;
    private static final Logger LOGGER = LoggerFactory.getLogger(SocialPublishingSweepService.class);
    private final SocialPostRepository posts;
    private final SocialPublishingStarter starter;
    private final PublishingSettings settings;

    @Override
    public int startDue(Instant now) {
        if (!settings.enabled()) {
            // Approved posts stay approved: failing them would settle them and email the admins once per post.
            LOGGER.info("Social publishing is switched off; approved posts wait");
            return 0;
        }
        if (settings.networks().isEmpty()) {
            LOGGER.info("Social publishing is enabled but no network is; no post is published");
            return 0;
        }
        int started = 0;
        Instant windowStart = now.minus(settings.mediaGrace().multipliedBy(WINDOW_GRACES));
        for (SocialPost post : posts.findDueForPublishing(windowStart, now, BATCH)) {
            try {
                if (starter.start(post, now) == SocialPublishingStarter.Result.STARTED) {
                    started++;
                }
            } catch (RuntimeException failure) {
                LOGGER.warn("Could not start publishing social post {}: {}", post.id(), failure.getMessage());
            }
        }
        return started;
    }
}
