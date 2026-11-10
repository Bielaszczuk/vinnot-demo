package com.vinnot.marketing.infrastructure.scheduling;

import com.vinnot.marketing.application.port.in.RenderSocialMediaUseCase;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Safety net of the media renders (#492), on the copy retry cadence: queues a render for every upcoming post whose media
 * still waits, such as a post stored before #492 or a request lost between saving the copy and queueing its render.
 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.marketing.enabled", havingValue = "true", matchIfMissing = true)
public class SocialMediaRenderScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(SocialMediaRenderScheduler.class);
    private final RenderSocialMediaUseCase render;

    @Scheduled(initialDelayString = "${app.marketing.generation.initial-delay-ms:300000}",
            fixedDelayString = "${app.marketing.generation.delay-ms:1800000}")
    public void requestPending() {
        int requested = render.requestPending(Instant.now());
        if (requested > 0) {
            LOGGER.info("Queued the media render of {} social post(s) still waiting for it", requested);
        }
    }
}
