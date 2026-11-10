package com.vinnot.marketing.infrastructure.scheduling;

import com.vinnot.marketing.application.port.in.CollectSocialMetricsUseCase;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Reads the recent publications' metrics every day at 06:00 in the planner's zone (#510). Off unless both
 * {@code app.marketing.enabled} and {@code app.marketing.metrics.enabled} are true.
 */
@Component
@RequiredArgsConstructor
@ConditionalOnExpression("${app.marketing.enabled:true} and ${app.marketing.metrics.enabled:false}")
public class SocialMetricsScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(SocialMetricsScheduler.class);
    private final CollectSocialMetricsUseCase metrics;

    @Scheduled(cron = "${app.marketing.metrics.cron:0 0 6 * * *}", zone = "${app.marketing.planner.zone:America/Argentina/Buenos_Aires}")
    public void collect() {
        LOGGER.info("Stored the metrics of {} social publication(s)", metrics.collect(Instant.now()));
    }
}
