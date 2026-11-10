package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.application.port.in.CheckPushReceiptsUseCase;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@ConditionalOnProperty(name = "app.notifications.push.receipts-enabled", havingValue = "true", matchIfMissing = true)
public class PushReceiptScheduler {
    private final CheckPushReceiptsUseCase receipts;

    public PushReceiptScheduler(CheckPushReceiptsUseCase receipts) {
        this.receipts = receipts;
    }

    @Scheduled(initialDelayString = "${app.notifications.push.receipts-initial-delay-ms:120000}",
            fixedDelayString = "${app.notifications.push.receipts-delay-ms:300000}")
    public void check() {
        receipts.execute(Instant.now());
    }
}
