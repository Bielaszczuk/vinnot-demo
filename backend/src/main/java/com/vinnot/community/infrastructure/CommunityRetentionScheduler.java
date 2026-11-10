package com.vinnot.community.infrastructure;

import com.vinnot.community.application.port.in.PurgeClosedReportsUseCase;

import lombok.RequiredArgsConstructor;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommunityRetentionScheduler {
    private final PurgeClosedReportsUseCase purge;

    @Scheduled(
            initialDelayString = "${app.community.retention.initial-delay:1h}",
            fixedDelayString = "${app.community.retention.interval:1h}")
    public void purgeClosedReports() {
        purge.execute();
    }
}
