package com.vinnot.marketing.infrastructure.scheduling;

import com.vinnot.marketing.application.port.in.GenerateSocialCopyUseCase;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/** Retries the copy of drafts the provider could not write, every 30 minutes (#489). */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.marketing.enabled", havingValue = "true", matchIfMissing = true)
public class SocialCopyGenerationScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(SocialCopyGenerationScheduler.class);
    private final GenerateSocialCopyUseCase copy;

    @Scheduled(initialDelayString = "${app.marketing.generation.initial-delay-ms:300000}",
            fixedDelayString = "${app.marketing.generation.delay-ms:1800000}")
    public void generatePending() {
        int generated = copy.generatePending(Instant.now());
        if (generated > 0) {
            LOGGER.info("Generated the copy of {} social post(s) waiting for it", generated);
        }
    }
}
