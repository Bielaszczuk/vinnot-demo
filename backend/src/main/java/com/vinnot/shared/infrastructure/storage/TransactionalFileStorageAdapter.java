package com.vinnot.shared.infrastructure.storage;

import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.shared.infrastructure.effects.DurableEffectQueue;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import java.io.InputStream;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Objects;
import java.util.Optional;

/** Decorates physical storage with committed deletion and crash-surviving orphan checks. */
@Component
@Primary
public class TransactionalFileStorageAdapter implements FileStoragePort {
    private final FileStoragePort storage;
    private final DurableEffectQueue queue;

    public TransactionalFileStorageAdapter(@Qualifier("physicalFileStorage") FileStoragePort storage, DurableEffectQueue queue) {
        this.storage = storage;
        this.queue = queue;
    }

    @Override
    public void storeCover(InputStream content, long size, UUID id) { storage.storeCover(content, size, id); }

    @Override
    public StoredFile loadCover(UUID id) { return storage.loadCover(id); }

    @Override
    public void deleteCover(UUID id) { storage.deleteCover(id); }

    /** Queues an orphan check that survives a rollback before writing; cleanup deletes the key only if unreferenced. */
    @Override
    public String storeSocialMedia(String key, byte[] content, String contentType) {
        queue.reconcileLater(SocialMediaObjects.CLEANUP_KIND, socialEffectKey(key), Map.of("key", key));
        return storage.storeSocialMedia(key, content, contentType);
    }

    @Override
    public Optional<StoredFile> loadSocialMedia(String key) { return storage.loadSocialMedia(key); }

    /** Deletion joins the caller's transaction, so a rolled-back replacement never removes media still in use. */
    @Override
    public void deleteSocialMedia(String key) {
        queue.enqueue(SocialMediaObjects.CLEANUP_KIND, socialEffectKey(key), Map.of("key", key), Duration.ZERO);
    }

    private static String socialEffectKey(String key) {
        return "social-media:" + SocialMediaObjects.requireKey(key) + ":" + UUID.randomUUID();
    }

    @Override
    public String publicWineLabelUrlPattern(UUID id) { return storage.publicWineLabelUrlPattern(id); }

    private void reconcile(String kind, UUID owner) {
        queue.reconcileLater(kind, kind + ":" + owner + ":" + UUID.randomUUID(), Map.of("owner", owner.toString()));
    }

    private void delete(String kind, UUID owner) {
        queue.enqueue(kind, kind + ":" + owner + ":" + UUID.randomUUID(), Map.of("owner", owner.toString()), Duration.ZERO);
    }

    @Override
    public String storeAvatar(InputStream content, String filename, String type, long size, UUID userId) {
        reconcile("avatar-orphans", userId);
        return storage.storeAvatar(content, filename, type, size, userId);
    }

    @Override
    public StoredFile loadAvatar(String filename) { return storage.loadAvatar(filename); }

    @Override
    public void deleteAvatar(String url, UUID userId) {
        if (Objects.isNull(url) || url.isBlank()) { return; }
        queue.enqueue("avatar-cleanup", "avatar:" + UUID.randomUUID(),
                Map.of("owner", userId.toString(), "url", url), Duration.ZERO);
    }

    @Override
    public List<String> listAvatarUrls(UUID userId, Instant olderThan) { return storage.listAvatarUrls(userId, olderThan); }

    @Override
    public String storeWineLabel(InputStream content, String filename, String type, long size, UUID submissionId) {
        reconcile("public-label-cleanup", submissionId);
        return storage.storeWineLabel(content, filename, type, size, submissionId);
    }

    @Override
    public StoredFile loadWineLabel(String filename) { return storage.loadWineLabel(filename); }

    @Override
    public String storeQuarantinedWineLabel(InputStream content, String filename, String type, long size, UUID submissionId) {
        reconcile("quarantine-cleanup", submissionId);
        return storage.storeQuarantinedWineLabel(content, filename, type, size, submissionId);
    }

    @Override
    public StoredFile loadQuarantinedWineLabel(UUID submissionId) { return storage.loadQuarantinedWineLabel(submissionId); }

    @Override
    public String promoteQuarantinedWineLabel(UUID submissionId) {
        reconcile("public-label-cleanup", submissionId);
        return storage.promoteQuarantinedWineLabel(submissionId);
    }

    @Override
    public void deleteQuarantinedWineLabel(UUID submissionId) { delete("quarantine-cleanup", submissionId); }

    @Override
    public void deletePublicWineLabel(UUID submissionId) { delete("public-label-cleanup", submissionId); }

    @Override
    public void deleteWineLabel(UUID submissionId) {
        deletePublicWineLabel(submissionId);
        deleteQuarantinedWineLabel(submissionId);
    }
}
