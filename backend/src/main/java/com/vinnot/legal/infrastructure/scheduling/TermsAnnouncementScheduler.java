package com.vinnot.legal.infrastructure.scheduling;

import com.vinnot.legal.application.port.in.AnnounceTermsUpdateUseCase;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/** Announces a new terms revision in batches every few minutes until everyone who must re-accept was told (#309). */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.legal.announcements.enabled", havingValue = "true", matchIfMissing = true)
public class TermsAnnouncementScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(TermsAnnouncementScheduler.class);
    private final AnnounceTermsUpdateUseCase announcements;

    @Scheduled(initialDelayString = "${app.legal.announcements.initial-delay-ms:60000}",
            fixedDelayString = "${app.legal.announcements.delay-ms:300000}")
    public void announce() {
        int queued = announcements.execute(Instant.now());
        if (queued > 0) {
            LOGGER.info("Queued {} terms update email(s)", queued);
        }
    }
}
