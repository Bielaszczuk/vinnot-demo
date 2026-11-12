package com.vinnot.wine.infrastructure.visual;

import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.wine.application.port.out.WineImageEmbeddingPort;
import com.vinnot.wine.application.service.WineVisualIndexService;
import com.vinnot.wine.infrastructure.config.CatalogMaintenanceSchedulingConfiguration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/**
 * Loads the stored label vectors after startup and embeds catalog images that have none yet, a bounded batch at
 * a time. A failed run is logged and retried on the next one; scans keep working with text retrieval meanwhile.
 * When the provider refuses for quota or rate limits, the backfill pauses (5 minutes, doubling up to 6 hours)
 * instead of calling it again every run; a successful run ends the pause.
 */
@Component
public class WineVisualIndexScheduler {

    static final Duration FIRST_PAUSE = Duration.ofMinutes(5);
    static final Duration MAX_PAUSE = Duration.ofHours(6);
    private static final Logger LOGGER = LoggerFactory.getLogger(WineVisualIndexScheduler.class);

    private final WineVisualIndexService service;
    private final boolean enabled;
    private final int batchSize;
    private final Clock clock;
    private Duration pause = Duration.ZERO;
    private Instant resumeAt = Instant.MIN;

    @Autowired
    public WineVisualIndexScheduler(WineVisualIndexService service,
            @Value("${app.wine-label.visual-index.enabled:true}") boolean enabled,
            @Value("${app.wine-label.visual-index.backfill-batch:200}") int batchSize) {
        this(service, enabled, batchSize, Clock.systemUTC());
    }

    WineVisualIndexScheduler(WineVisualIndexService service, boolean enabled, int batchSize, Clock clock) {
        if (batchSize < 1) {
            throw new IllegalArgumentException("app.wine-label.visual-index.backfill-batch must be positive");
        }
        this.service = service;
        this.enabled = enabled;
        this.batchSize = batchSize;
        this.clock = clock;
    }

    @Scheduled(scheduler = CatalogMaintenanceSchedulingConfiguration.SCHEDULER,
            initialDelayString = "${app.wine-label.visual-index.initial-delay-ms:30000}",
            fixedDelayString = "${app.wine-label.visual-index.backfill-delay-ms:60000}")
    public synchronized int refresh() {
        Instant now = clock.instant();
        if (!enabled || now.isBefore(resumeAt)) {
            return 0;
        }
        try {
            service.load();
            int embedded = service.backfill(batchSize);
            pause = Duration.ZERO;
            resumeAt = Instant.MIN;
            if (embedded > 0) {
                LOGGER.info("Embedded {} catalog label image(s) for visual search", embedded);
            }
            return embedded;
        } catch (ExternalServiceUnavailableException exception) {
            if (WineImageEmbeddingPort.PROVIDER_LIMITED.equals(exception.getCode())) {
                pause = pause.isZero() ? FIRST_PAUSE : min(pause.multipliedBy(2), MAX_PAUSE);
                resumeAt = now.plus(pause);
                LOGGER.warn("Visual index refresh paused for {} min: {}", pause.toMinutes(), exception.getMessage());
            } else {
                LOGGER.warn("Visual index refresh failed: {} {}", exception.getCode(), exception.getMessage());
            }
            return 0;
        } catch (RuntimeException exception) {
            LOGGER.warn("Visual index refresh failed: {}", exception.getClass().getSimpleName());
            return 0;
        }
    }

    private static Duration min(Duration left, Duration right) {
        return left.compareTo(right) <= 0 ? left : right;
    }
}
