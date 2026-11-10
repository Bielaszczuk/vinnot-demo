package com.vinnot.shared.infrastructure.media;

import com.vinnot.shared.infrastructure.effects.DurableEffectQueue;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;

/** Reconciles covers detached by cascading account deletion or old effects, in bounded batches. */
@Component
public class ManagedCoverMaintenance {
    private final JdbcTemplate jdbc;
    private final DurableEffectQueue queue;
    public ManagedCoverMaintenance(JdbcTemplate jdbc, DurableEffectQueue queue) {
        this.jdbc = jdbc;
        this.queue = queue;
    }

    @Scheduled(cron = "${app.uploads.cover-cleanup-cron:0 15 3 * * *}")
    public void reconcileUnused() {
        var ids = jdbc.queryForList("""
                SELECT m.id FROM managed_cover_images m WHERE m.created_at < now() - interval '1 hour'
                  AND NOT EXISTS(SELECT 1 FROM events e WHERE e.image_url = m.image_url)
                  AND NOT EXISTS(SELECT 1 FROM wine_routes r WHERE r.image_url = m.image_url)
                ORDER BY m.created_at LIMIT 100
                """, UUID.class);
        for (UUID id : ids) {
            queue.reconcileLater("cover-cleanup", "cover-daily:" + id + ":" + LocalDate.now(ZoneOffset.UTC), Map.of("owner", id.toString()));
        }
    }
}
