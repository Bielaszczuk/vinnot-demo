package com.vinnot.wine.infrastructure.persistence.search;

import com.vinnot.wine.infrastructure.config.CatalogMaintenanceSchedulingConfiguration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Rewrites catalog search rows indexed before V90 with the unaccented build functions (#544). It walks each read
 * model in primary-key order and commits every batch on its own, so memory, WAL and row locks stay bounded and
 * wine writes never wait for a long transaction; rebuilding the 1.7M-row read models in one migration exceeded the
 * production container. Once a full pass finds nothing left to rewrite it stops until the next restart. Running on
 * several instances at once only repeats idempotent work.
 */
@Component
public class CatalogSearchAccentNormalizer {

    private static final Logger LOGGER = LoggerFactory.getLogger(CatalogSearchAccentNormalizer.class);
    private static final List<String> READ_MODELS = List.of("wine_catalog_search", "wine_catalog_filter_search");

    private final JdbcTemplate jdbc;
    private final boolean enabled;
    private final int batchSize;
    private final Duration pause;
    private volatile boolean completed;

    @Autowired
    public CatalogSearchAccentNormalizer(JdbcTemplate jdbc,
            @Value("${app.wine-label.search-normalization.enabled:true}") boolean enabled,
            @Value("${app.wine-label.search-normalization.batch-size:5000}") int batchSize,
            @Value("${app.wine-label.search-normalization.pause:200ms}") Duration pause) {
        if (batchSize < 1) {
            throw new IllegalArgumentException("app.wine-label.search-normalization.batch-size must be positive");
        }
        if (pause.isNegative()) {
            throw new IllegalArgumentException("app.wine-label.search-normalization.pause must not be negative");
        }
        this.jdbc = jdbc;
        this.enabled = enabled;
        this.batchSize = batchSize;
        this.pause = pause;
    }

    @Scheduled(scheduler = CatalogMaintenanceSchedulingConfiguration.SCHEDULER,
            initialDelayString = "${app.wine-label.search-normalization.initial-delay-ms:60000}",
            fixedDelayString = "${app.wine-label.search-normalization.delay-ms:3600000}")
    public int normalizePending() {
        if (!enabled || completed) {
            return 0;
        }
        int total = 0;
        for (String readModel : READ_MODELS) {
            total += normalize(readModel);
        }
        completed = total == 0;
        if (total > 0) {
            LOGGER.info("Rewrote {} catalog search row(s) without accents", total);
        }
        return total;
    }

    private int normalize(String readModel) {
        int rewritten = 0;
        UUID after = null;
        while (true) {
            List<UUID> batch = Objects.isNull(after)
                    ? jdbc.queryForList("SELECT wine_id FROM public." + readModel
                            + " ORDER BY wine_id LIMIT ?", UUID.class, batchSize)
                    : jdbc.queryForList("SELECT wine_id FROM public." + readModel
                            + " WHERE wine_id > ? ORDER BY wine_id LIMIT ?", UUID.class, after, batchSize);
            if (batch.isEmpty()) {
                return rewritten;
            }
            rewritten += jdbc.update("UPDATE public." + readModel + " catalog "
                    + "SET search_vector = public.build_wine_catalog_search_vector(wine.name, winery.name), "
                    + "search_text = public.build_wine_catalog_search_text(wine.name, winery.name) "
                    + "FROM public.wines wine LEFT JOIN public.wineries winery ON winery.id = wine.winery_id "
                    + "WHERE wine.id = catalog.wine_id AND catalog.wine_id BETWEEN ? AND ? "
                    + "AND catalog.search_text <> public.catalog_search_unaccent(catalog.search_text)",
                    batch.getFirst(), batch.getLast());
            if (batch.size() < batchSize) {
                return rewritten;
            }
            after = batch.getLast();
            pauseBetweenBatches();
        }
    }

    private void pauseBetweenBatches() {
        if (pause.isZero()) {
            return;
        }
        try {
            Thread.sleep(pause);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Catalog search normalization was interrupted", interrupted);
        }
    }
}
