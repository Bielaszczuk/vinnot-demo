package com.vinnot.engagement.infrastructure.scheduling;

import com.vinnot.engagement.application.port.in.AutoPauseEngagementUseCase;
import com.vinnot.engagement.application.port.in.PurgeEngagementLedgerUseCase;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/** Hourly opt-out check that pauses noisy engagement types, and the daily ledger retention (#405). */
@Component
@ConditionalOnProperty(name = "app.engagement.enabled", havingValue = "true", matchIfMissing = true)
public class EngagementMaintenanceScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(EngagementMaintenanceScheduler.class);
    private final AutoPauseEngagementUseCase autoPause;
    private final PurgeEngagementLedgerUseCase retention;

    public EngagementMaintenanceScheduler(AutoPauseEngagementUseCase autoPause, PurgeEngagementLedgerUseCase retention) {
        this.autoPause = autoPause;
        this.retention = retention;
    }

    @Scheduled(initialDelayString = "${app.engagement.initial-delay-ms:600000}",
            fixedDelayString = "${app.engagement.auto-pause.delay-ms:3600000}")
    public void pauseNoisyTypes() {
        autoPause.pauseNoisyTypes(Instant.now());
    }

    @Scheduled(initialDelayString = "${app.engagement.initial-delay-ms:600000}",
            fixedDelayString = "${app.engagement.retention-delay-ms:86400000}")
    public void purgeLedger() {
        int deleted = retention.purge(Instant.now());
        if (deleted > 0) {
            LOGGER.info("Deleted {} engagement ledger row(s) past retention", deleted);
        }
    }
}
