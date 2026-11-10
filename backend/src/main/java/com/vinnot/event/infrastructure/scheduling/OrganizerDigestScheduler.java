package com.vinnot.event.infrastructure.scheduling;

import com.vinnot.event.application.port.in.SendOrganizerDigestsUseCase;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Pushes due organizer digests every minute; each run sends at most one batch. */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.events.organizer-digests.enabled", havingValue = "true", matchIfMissing = true)
public class OrganizerDigestScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(OrganizerDigestScheduler.class);
    private final SendOrganizerDigestsUseCase digests;

    @Scheduled(
            initialDelayString = "${app.events.organizer-digests.initial-delay-ms:60000}",
            fixedDelayString = "${app.events.organizer-digests.delay-ms:60000}")
    public void sendDue() {
        int queued = digests.execute();
        if (queued > 0) {
            LOGGER.info("Queued {} organizer digest push(es)", queued);
        }
    }
}
