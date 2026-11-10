package com.vinnot.user.infrastructure.scheduling;

import com.vinnot.user.application.port.in.PurgeExpiredSecurityEventsUseCase;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Deletes security events past their retention once a day (#482). */
@Component
@ConditionalOnProperty(name = "app.security.events.retention-enabled", havingValue = "true", matchIfMissing = true)
public class SecurityEventRetentionScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(SecurityEventRetentionScheduler.class);
    private final PurgeExpiredSecurityEventsUseCase purge;

    public SecurityEventRetentionScheduler(PurgeExpiredSecurityEventsUseCase purge) {
        this.purge = purge;
    }

    @Scheduled(initialDelayString = "${app.security.events.retention-initial-delay-ms:900000}",
            fixedDelayString = "${app.security.events.retention-delay-ms:86400000}")
    public void purgeExpired() {
        int deleted = purge.execute();
        if (deleted > 0) {
            LOGGER.info("Deleted {} security event row(s) past retention", deleted);
        }
    }
}
