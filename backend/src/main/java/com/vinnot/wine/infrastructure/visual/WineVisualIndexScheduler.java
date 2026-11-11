package com.vinnot.wine.infrastructure.visual;

import com.vinnot.wine.application.service.WineVisualIndexService;
import com.vinnot.wine.infrastructure.config.CatalogMaintenanceSchedulingConfiguration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Loads the stored label vectors after startup and embeds catalog images that have none yet, a bounded batch at
 * a time. A failed run is logged and retried on the next one; scans keep working with text retrieval meanwhile.
 */
@Component
public class WineVisualIndexScheduler {

    private static final Logger LOGGER = LoggerFactory.getLogger(WineVisualIndexScheduler.class);

    private final WineVisualIndexService service;
    private final boolean enabled;
    private final int batchSize;

    public WineVisualIndexScheduler(WineVisualIndexService service,
            @Value("${app.wine-label.visual-index.enabled:true}") boolean enabled,
            @Value("${app.wine-label.visual-index.backfill-batch:200}") int batchSize) {
        if (batchSize < 1) {
            throw new IllegalArgumentException("app.wine-label.visual-index.backfill-batch must be positive");
        }
        this.service = service;
        this.enabled = enabled;
        this.batchSize = batchSize;
    }

    @Scheduled(scheduler = CatalogMaintenanceSchedulingConfiguration.SCHEDULER,
            initialDelayString = "${app.wine-label.visual-index.initial-delay-ms:30000}",
            fixedDelayString = "${app.wine-label.visual-index.backfill-delay-ms:60000}")
    public int refresh() {
        if (!enabled) {
            return 0;
        }
        try {
            service.load();
            int embedded = service.backfill(batchSize);
            if (embedded > 0) {
                LOGGER.info("Embedded {} catalog label image(s) for visual search", embedded);
            }
            return embedded;
        } catch (RuntimeException exception) {
            LOGGER.warn("Visual index refresh failed: {}", exception.getClass().getSimpleName());
            return 0;
        }
    }
}
