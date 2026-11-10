package com.vinnot.marketing.infrastructure.scheduling;

import com.vinnot.marketing.application.model.PlanResult;
import com.vinnot.marketing.application.port.in.PlanWeekUseCase;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/** Plans the next two weeks of social posts every Monday at 09:00 in Argentina (#489). */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.marketing.enabled", havingValue = "true", matchIfMissing = true)
public class SocialPlannerScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(SocialPlannerScheduler.class);
    private final PlanWeekUseCase planner;

    @Scheduled(cron = "${app.marketing.planner.cron:0 0 9 * * MON}",
            zone = "${app.marketing.planner.zone:America/Argentina/Buenos_Aires}")
    public void planWeek() {
        PlanResult result = planner.execute(Instant.now());
        LOGGER.info("Planned {} social post(s) for {} to {}", result.created(), result.from(), result.to());
    }
}
