package com.vinnot.shared.infrastructure.media;

import com.vinnot.shared.application.media.CoverImageRegistryPort;
import com.vinnot.shared.application.media.CoverImageUseCase;
import com.vinnot.shared.domain.valueobject.ResourceReader;
import com.vinnot.shared.infrastructure.effects.DurableEffectQueue;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.util.Map;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;

/** Cross-module read projection for visibility; never writes events or routes. */
@Component
public class JdbcCoverImageRegistry implements CoverImageRegistryPort {
    private final JdbcTemplate jdbc;
    private final DurableEffectQueue effects;
    private final String provider;
    public JdbcCoverImageRegistry(JdbcTemplate jdbc, DurableEffectQueue effects,
            @Value("${app.storage.provider:local}") String provider) {
        this.jdbc = jdbc;
        this.effects = effects;
        this.provider = provider;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void stage(UUID id, UUID owner, CoverImageUseCase.Kind kind, String url) {
        String day = LocalDate.now(ZoneOffset.UTC).toString();
        // A row lock serializes the per-user daily quota across instances, independent of request rate limiting.
        jdbc.update("INSERT INTO storage_operation_budgets(scope, period) VALUES (?, ?) ON CONFLICT DO NOTHING", "cover-user-" + owner, day);
        int changed = jdbc.update("UPDATE storage_operation_budgets SET operations = operations + 1 WHERE scope = ? AND period = ? AND operations < 20",
                "cover-user-" + owner, day);
        if (changed != 1) { throw new IllegalArgumentException("Daily image upload limit reached"); }
        jdbc.update("INSERT INTO managed_cover_images(id, owner_id, kind, image_url, storage_provider) VALUES (?, ?, ?, ?, ?)", id, owner, kind.name(), url, provider);
        reconcileLater(id);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markReady(UUID id) {
        jdbc.update("UPDATE managed_cover_images SET ready = true WHERE id = ?", id);
    }

    @Override
    @Transactional
    public boolean retainsExistingReference(UUID id, CoverImageUseCase.Kind kind) {
        return !jdbc.queryForList("SELECT id FROM managed_cover_images WHERE id = ? AND kind = ? AND ready FOR UPDATE",
                UUID.class, id, kind.name()).isEmpty();
    }

    @Override
    @Transactional
    public boolean permitsAttachment(UUID id, CoverImageUseCase.Kind kind, ResourceReader actor) {
        // The resource command holds this lock until its image reference commits.
        return !jdbc.queryForList("""
                SELECT id FROM managed_cover_images WHERE id = ? AND kind = ? AND ready AND (owner_id = ? OR ?) FOR UPDATE
                """, UUID.class, id, kind.name(), actor.userId(), actor.catalogStaff()).isEmpty();
    }

    @Override
    public boolean permitsRead(UUID id, ResourceReader reader) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM managed_cover_images m WHERE m.id = ? AND m.ready AND (
                  (m.owner_id = ? AND NOT EXISTS(SELECT 1 FROM events e WHERE e.image_url = m.image_url)
                    AND NOT EXISTS(SELECT 1 FROM wine_routes r WHERE r.image_url = m.image_url))
                  OR ?
                  OR EXISTS(SELECT 1 FROM events e WHERE e.image_url = m.image_url AND (e.organizer_id = ? OR (e.published_once AND e.status <> 'DRAFT')))
                  OR EXISTS(SELECT 1 FROM wine_routes r WHERE r.image_url = m.image_url AND (r.created_by = ? OR r.status = 'PUBLISHED'))
                ))
                """, Boolean.class, id, reader.userId(), reader.catalogStaff(), reader.userId(), reader.userId()));
    }

    @Override
    public void reconcileLater(UUID id) {
        effects.reconcileLater("cover-cleanup", "cover:" + id + ":" + UUID.randomUUID(), Map.of("owner", id.toString()));
    }
}
