package com.vinnot.activity.infrastructure.scheduling;

import com.vinnot.activity.application.port.in.PurgeExpiredActivityUseCase;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Deletes engagement signals past their retention once a day (#405). */
@Component
@ConditionalOnProperty(name = "app.activity.retention-enabled", havingValue = "true", matchIfMissing = true)
public class ActivityRetentionScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(ActivityRetentionScheduler.class);
    private final PurgeExpiredActivityUseCase purge;

    public ActivityRetentionScheduler(PurgeExpiredActivityUseCase purge) {
        this.purge = purge;
    }

    @Scheduled(initialDelayString = "${app.activity.retention-initial-delay-ms:600000}",
            fixedDelayString = "${app.activity.retention-delay-ms:86400000}")
    public void purgeExpired() {
        int deleted = purge.execute();
        if (deleted > 0) {
            LOGGER.info("Deleted {} engagement signal row(s) past retention", deleted);
        }
    }
}
