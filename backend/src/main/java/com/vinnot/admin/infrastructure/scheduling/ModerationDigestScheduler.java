package com.vinnot.admin.infrastructure.scheduling;

import com.vinnot.admin.application.port.in.SendModerationDigestUseCase;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/** Emails the moderation team every 15 minutes when new work arrived (#307). */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.moderation.digest.enabled", havingValue = "true", matchIfMissing = true)
public class ModerationDigestScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(ModerationDigestScheduler.class);
    private final SendModerationDigestUseCase digests;

    @Scheduled(
            initialDelayString = "${app.moderation.digest.initial-delay-ms:120000}",
            fixedDelayString = "${app.moderation.digest.delay-ms:900000}")
    public void sendDue() {
        int queued = digests.execute(Instant.now());
        if (queued > 0) {
            LOGGER.info("Queued {} moderation digest email(s)", queued);
        }
    }
}
