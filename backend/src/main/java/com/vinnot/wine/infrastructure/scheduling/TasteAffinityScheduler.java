package com.vinnot.wine.infrastructure.scheduling;

import com.vinnot.wine.application.port.in.ComputeTasteAffinitiesUseCase;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Recomputes taste affinities every night (#306), at a fixed time of an explicit zone (UTC unless configured) rather
 * than the server's own. Running it twice is harmless: each run replaces the table, and a run that finds another
 * instance recomputing skips (#405).
 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.recommendations.enabled", havingValue = "true", matchIfMissing = true)
public class TasteAffinityScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(TasteAffinityScheduler.class);
    private final ComputeTasteAffinitiesUseCase affinities;

    @Scheduled(cron = "${app.recommendations.affinities.cron:0 40 3 * * *}", zone = "${app.recommendations.affinities.zone:UTC}")
    public void recompute() {
        LOGGER.info("Computed {} taste affinities", affinities.execute(Instant.now()));
    }
}
