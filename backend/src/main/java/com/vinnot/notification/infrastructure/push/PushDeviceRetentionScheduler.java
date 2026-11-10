package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.application.port.in.ManagePushDevicesUseCase;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Daily purge of devices the app stopped registering. Idempotent, so every instance may run it. */
@Component
@ConditionalOnProperty(name = "app.notifications.push.device-purge-enabled", havingValue = "true", matchIfMissing = true)
public class PushDeviceRetentionScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(PushDeviceRetentionScheduler.class);
    private final ManagePushDevicesUseCase devices;

    public PushDeviceRetentionScheduler(ManagePushDevicesUseCase devices) {
        this.devices = devices;
    }

    @Scheduled(cron = "${app.notifications.push.device-purge-cron:0 50 3 * * *}")
    public void purge() {
        int purged = devices.purgeStale();
        if (purged > 0) {
            LOGGER.info("Forgot {} push device(s) the app stopped registering", purged);
        }
    }
}
