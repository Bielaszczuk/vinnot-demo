package com.vinnot.shared.infrastructure.storage;

import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.shared.infrastructure.effects.ExternalEffectHandler;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
public class StorageCleanupEffectHandler implements ExternalEffectHandler {
    private static final Logger LOG = LoggerFactory.getLogger(StorageCleanupEffectHandler.class);
    private static final Set<String> KINDS = Set.of("avatar-cleanup", "avatar-orphans", "public-label-cleanup", "quarantine-cleanup",
            "cover-cleanup", SocialMediaObjects.CLEANUP_KIND);
    private static final SocialMediaReferences KEEP_ALL = key -> {
        LOG.warn("No social media reference checker is registered; keeping the stored object");
        return true;
    };
    private final FileStoragePort storage;
    private final JdbcTemplate jdbc;
    private final SocialMediaReferences socialMediaReferences;

    public StorageCleanupEffectHandler(FileStoragePort storage, JdbcTemplate jdbc) {
        this(storage, jdbc, KEEP_ALL);
    }

    @Autowired
    public StorageCleanupEffectHandler(@Qualifier("physicalFileStorage") FileStoragePort storage, JdbcTemplate jdbc,
            ObjectProvider<SocialMediaReferences> socialMediaReferences) {
        this(storage, jdbc, key -> socialMediaReferences.getIfAvailable(() -> KEEP_ALL).isReferenced(key));
    }

    StorageCleanupEffectHandler(FileStoragePort storage, JdbcTemplate jdbc, SocialMediaReferences socialMediaReferences) {
        this.storage = storage;
        this.jdbc = jdbc;
        this.socialMediaReferences = socialMediaReferences;
    }

    @Override
    public boolean supports(String kind) { return KINDS.contains(kind); }

    @Override
    @Transactional
    public void execute(String kind, Map<String, Object> payload) {
        if (SocialMediaObjects.CLEANUP_KIND.equals(kind)) {
            String key = SocialMediaObjects.requireKey((String) payload.get("key"));
            if (!socialMediaReferences.isReferenced(key)) { storage.deleteSocialMedia(key); }
            return;
        }
        UUID owner = UUID.fromString((String) payload.get("owner"));
        switch (kind) {
            case "cover-cleanup" -> {
                if (jdbc.queryForList("SELECT id FROM managed_cover_images WHERE id = ? FOR UPDATE", UUID.class, owner).isEmpty()) {
                    return;
                }
                boolean referenced = Boolean.TRUE.equals(jdbc.queryForObject("""
                        SELECT EXISTS(SELECT 1 FROM managed_cover_images m WHERE m.id = ? AND (
                          m.created_at > now() - interval '1 hour'
                          OR EXISTS(SELECT 1 FROM events e WHERE e.image_url = m.image_url)
                          OR EXISTS(SELECT 1 FROM wine_routes r WHERE r.image_url = m.image_url)))
                        """, Boolean.class, owner));
                if (!referenced) {
                    storage.deleteCover(owner);
                    jdbc.update("DELETE FROM managed_cover_images WHERE id = ?", owner);
                }
            }
            case "avatar-cleanup" -> deleteAvatarIfUnused(owner, (String) payload.get("url"));
            case "avatar-orphans" -> storage.listAvatarUrls(owner, Instant.now().minus(Duration.ofHours(1)))
                    .forEach(url -> deleteAvatarIfUnused(owner, url));
            case "public-label-cleanup" -> {
                String pattern = "/api/uploads/wine-labels/wine_label_" + owner + ".%";
                String currentPattern = storage.publicWineLabelUrlPattern(owner);
                boolean referenced = Boolean.TRUE.equals(jdbc.queryForObject("""
                        SELECT EXISTS(SELECT 1 FROM wines WHERE image_url LIKE ? OR image_url LIKE ?)
                          OR EXISTS(SELECT 1 FROM wine_submissions WHERE id = ? AND (image_url LIKE ? OR image_url LIKE ?))
                        """, Boolean.class, pattern, currentPattern, owner, pattern, currentPattern));
                if (!referenced) { storage.deletePublicWineLabel(owner); }
            }
            case "quarantine-cleanup" -> {
                boolean referenced = Boolean.TRUE.equals(jdbc.queryForObject("""
                        SELECT EXISTS(SELECT 1 FROM wine_submissions WHERE id = ? AND image_quarantined = true)
                        """, Boolean.class, owner));
                if (!referenced) { storage.deleteQuarantinedWineLabel(owner); }
            }
            default -> throw new IllegalArgumentException("Unsupported storage cleanup effect");
        }
    }

    private void deleteAvatarIfUnused(UUID owner, String url) {
        // Social sign-in stores the provider's picture URL; it is not a stored file, so there is nothing to delete.
        if (!FileStorageService.isOwnedAvatarUrl(url, owner)) {
            return;
        }
        boolean referenced = Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM users WHERE profile_image_url = ?)", Boolean.class, url));
        if (!referenced) { storage.deleteAvatar(url, owner); }
    }
}
