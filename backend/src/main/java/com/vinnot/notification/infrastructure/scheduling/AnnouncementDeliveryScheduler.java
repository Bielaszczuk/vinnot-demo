package com.vinnot.notification.infrastructure.scheduling;

import com.vinnot.notification.application.port.in.DeliverAnnouncementsUseCase;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/** Queues administrators' announcements (#310) one batch per run, until every pending one reached its audience. */
@Component
@ConditionalOnProperty(name = "app.notifications.announcements.enabled", havingValue = "true", matchIfMissing = true)
public class AnnouncementDeliveryScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(AnnouncementDeliveryScheduler.class);
    private final DeliverAnnouncementsUseCase announcements;

    public AnnouncementDeliveryScheduler(DeliverAnnouncementsUseCase announcements) {
        this.announcements = announcements;
    }

    @Scheduled(initialDelayString = "${app.notifications.announcements.initial-delay-ms:30000}",
            fixedDelayString = "${app.notifications.announcements.delay-ms:30000}")
    public void deliver() {
        int queued = announcements.execute(Instant.now());
        if (queued > 0) {
            LOGGER.info("Queued an announcement for {} account(s)", queued);
        }
    }
}
