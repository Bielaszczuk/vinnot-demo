package com.vinnot.wine.infrastructure.scheduling;

import com.vinnot.wine.application.service.WineSubmissionRetentionService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

@Component
@RequiredArgsConstructor
public class WineSubmissionRetentionScheduler {

    private final WineSubmissionRetentionService retentionService;

    @Value("${app.wine-submissions.retention.rejected:30d}")
    private Duration rejectedRetention;

    @Value("${app.wine-submissions.retention.corrections:90d}")
    private Duration correctionsRetention;

    @Value("${app.wine-submissions.retention.batch-size:100}")
    private int batchSize;

    @Scheduled(cron = "${app.wine-submissions.retention.cron:0 25 3 * * *}")
    public void purgeExpiredSubmissions() {
        Instant now = Instant.now();
        retentionService.purgeRejectedBefore(now.minus(rejectedRetention), batchSize);
        retentionService.purgeUncorrectedBefore(now.minus(correctionsRetention), batchSize);
    }
}
