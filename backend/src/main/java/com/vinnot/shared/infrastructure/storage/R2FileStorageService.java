package com.vinnot.shared.infrastructure.storage;

import com.vinnot.shared.application.media.ImageOptimizationPort;
import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.model.S3Exception;
import java.util.Arrays;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.IOException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

/** R2 writes are optimized; old URLs keep reading/deleting through the previous provider. */
@Service("physicalFileStorage")
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "r2")
public class R2FileStorageService implements FileStoragePort {
    private static final int PRECONDITION_FAILED = 412;
    private final S3Client r2;
    private final FileStoragePort legacy;
    private final ImageOptimizationPort optimizer;
    private final R2OperationBudget budget;
    private final JdbcTemplate jdbc;
    private final R2AvatarInventory inventory;
    private final String bucket;
    private final String namespace;
    private final String publicBase;

    public R2FileStorageService(@Qualifier("r2Client") S3Client r2,
            @Qualifier("legacyFileStorage") FileStoragePort legacy, ImageOptimizationPort optimizer,
            R2OperationBudget budget, JdbcTemplate jdbc, R2AvatarInventory inventory, @Value("${app.storage.r2.bucket}") String bucket,
            @Value("${app.storage.r2.environment}") String environment,
            @Value("${app.storage.r2.public-base-url}") String publicBase) {
        if (!List.of("development", "production").contains(environment)
                || !publicBase.matches("https://images\\.vinnot\\.com")) {
            throw new IllegalArgumentException("Invalid managed R2 namespace/domain");
        }
        this.r2 = r2;
        this.legacy = legacy;
        this.optimizer = optimizer;
        this.budget = budget;
        this.jdbc = jdbc;
        this.inventory = inventory;
        this.bucket = bucket;
        this.namespace = "uploads/" + environment + "/";
        this.publicBase = publicBase;
    }

    private String url(String folder, String filename) { return publicBase + "/" + namespace + folder + "/" + filename; }
    private String key(String folder, String filename) { return namespace + folder + "/" + filename; }
    private boolean managed(String filename) { return filename.endsWith(".r2.webp"); }
    private String label(UUID id) { return "wine_label_" + id + ".r2.webp"; }

    @Override
    public void storeCover(InputStream content, long size, UUID id) {
        try {
            byte[] bytes = FileStorageService.readImageContent(content);
            FileStorageService.validateImageContent(bytes, "image/webp");
            put(coverFolder(id), id + ".webp", bytes);
        } catch (IOException exception) { throw new IllegalStateException("Could not store cover image", exception); }
    }

    private String coverFolder(UUID id) {
        String kind = jdbc.queryForObject("SELECT kind FROM managed_cover_images WHERE id = ?", String.class, id);
        return "EVENT".equals(kind) ? "events" : "wine-routes";
    }

    private boolean r2Cover(UUID id) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM managed_cover_images WHERE id = ? AND storage_provider = 'r2')", Boolean.class, id));
    }

    @Override
    public StoredFile loadCover(UUID id) {
        try {
            return r2Cover(id) ? get(coverFolder(id), id + ".webp") : legacy.loadCover(id);
        } catch (NoSuchKeyException exception) {
            throw new EntityNotFoundException("Image not found");
        }
    }

    @Override
    public void deleteCover(UUID id) {
        if (r2Cover(id)) { delete(coverFolder(id), id + ".webp"); }
        else { legacy.deleteCover(id); }
    }

    @Override
    public String storeAvatar(InputStream content, String name, String type, long size, UUID owner) {
        String filename = "avatar_" + owner + "_" + UUID.randomUUID() + ".r2.webp";
        // A durable inventory is inserted before storage so reconciliation survives database rollback.
        String result = url("avatars", filename);
        inventory.record(owner, result);
        var image = optimizer.optimize(content, type, size, ImageOptimizationPort.Purpose.AVATAR);
        put("avatars", filename, image.bytes());
        return result;
    }

    @Override
    public StoredFile loadAvatar(String filename) {
        try { return managed(filename) ? get("avatars", safeAvatar(filename)) : legacy.loadAvatar(filename); }
        catch (NoSuchKeyException exception) { throw new IllegalArgumentException("Avatar file not found", exception); }
    }

    private String safeAvatar(String filename) {
        String safe = FileStorageService.sanitizeFilename(filename);
        if (!safe.matches("avatar_[0-9a-f-]{36}_[0-9a-f-]{36}\\.r2\\.webp")) { throw new IllegalArgumentException("Invalid avatar filename"); }
        return safe;
    }

    @Override
    public void deleteAvatar(String imageUrl, UUID owner) {
        if (!imageUrl.startsWith(publicBase + "/" + namespace + "avatars/")) {
            legacy.deleteAvatar(imageUrl, owner);
            return;
        }
        String filename = safeAvatar(FileStorageService.ownedAvatarFilename(imageUrl, owner));
        delete("avatars", filename);
        jdbc.update("DELETE FROM r2_avatar_inventory WHERE image_url = ? AND owner_id = ?", imageUrl, owner);
    }

    @Override
    public List<String> listAvatarUrls(UUID owner, Instant olderThan) {
        List<String> urls = new ArrayList<>(legacy.listAvatarUrls(owner, olderThan));
        urls.addAll(jdbc.queryForList("SELECT image_url FROM r2_avatar_inventory WHERE owner_id = ? AND created_at < ?",
                String.class, owner, Timestamp.from(olderThan)));
        return urls;
    }

    @Override
    public String storeWineLabel(InputStream content, String name, String type, long size, UUID submission) {
        var image = optimizer.optimize(content, type, size, ImageOptimizationPort.Purpose.LABEL);
        put("wine-labels", label(submission), image.bytes());
        return url("wine-labels", label(submission));
    }

    @Override
    public StoredFile loadWineLabel(String filename) {
        try { return managed(filename) ? get("wine-labels", safeLabel(filename)) : legacy.loadWineLabel(filename); }
        catch (NoSuchKeyException exception) { throw new IllegalArgumentException("Wine-label file not found", exception); }
    }

    private String safeLabel(String filename) {
        String safe = FileStorageService.sanitizeFilename(filename);
        if (!safe.matches("wine_label_[0-9a-f-]{36}\\.r2\\.webp")) { throw new IllegalArgumentException("Invalid label filename"); }
        return safe;
    }

    @Override
    public String storeQuarantinedWineLabel(InputStream content, String name, String type, long size, UUID submission) {
        var image = optimizer.optimize(content, type, size, ImageOptimizationPort.Purpose.LABEL);
        put("quarantine", label(submission), image.bytes());
        return "/api/admin/wine-submissions/" + submission + "/image";
    }

    @Override
    public StoredFile loadQuarantinedWineLabel(UUID submission) {
        try { return get("quarantine", label(submission)); }
        catch (NoSuchKeyException exception) { return legacy.loadQuarantinedWineLabel(submission); }
    }

    @Override
    public String promoteQuarantinedWineLabel(UUID submission) {
        try {
            StoredFile image = get("quarantine", label(submission));
            put("wine-labels", label(submission), image.content().readAllBytes());
            return url("wine-labels", label(submission));
        } catch (NoSuchKeyException exception) {
            // Existing quarantined JPEGs also publish to R2; only their reads/cleanup remain legacy.
            StoredFile old = legacy.loadQuarantinedWineLabel(submission);
            try (var content = old.content()) {
                var image = optimizer.optimize(content, old.contentType(), old.size(), ImageOptimizationPort.Purpose.LABEL);
                put("wine-labels", label(submission), image.bytes());
                return url("wine-labels", label(submission));
            } catch (IOException failure) {
                throw new IllegalStateException("Failed to promote legacy image", failure);
            }
        }
        catch (IOException exception) { throw new IllegalStateException("Failed to promote image", exception); }
    }

    @Override
    public void deletePublicWineLabel(UUID submission) {
        delete("wine-labels", label(submission));
        legacy.deletePublicWineLabel(submission); }
    @Override
    public void deleteQuarantinedWineLabel(UUID submission) {
        delete("quarantine", label(submission));
        legacy.deleteQuarantinedWineLabel(submission); }
    @Override
    public void deleteWineLabel(UUID submission) {
        deletePublicWineLabel(submission);
        deleteQuarantinedWineLabel(submission); }
    @Override
    public String publicWineLabelUrlPattern(UUID submission) { return url("wine-labels", label(submission)); }

    /**
     * Social media reserves its own monthly byte allowance (see {@link R2OperationBudget#reserveSocialWrite}) so
     * re-rendered carousels cannot exhaust the lifetime allowance that user uploads depend on.
     */
    @Override
    public String storeSocialMedia(String key, byte[] content, String contentType) {
        SocialMediaObjects.requireContent(key, content, contentType);
        budget.reserveSocialWrite(content.length);
        writeOnce(SocialMediaObjects.FOLDER, key, content, contentType,
                () -> get(SocialMediaObjects.FOLDER, key, contentType, SocialMediaObjects.MAX_BYTES).content());
        return url(SocialMediaObjects.FOLDER, key);
    }

    @Override
    public Optional<StoredFile> loadSocialMedia(String key) {
        String contentType = SocialMediaObjects.contentType(key);
        try {
            return Optional.of(get(SocialMediaObjects.FOLDER, key, contentType, SocialMediaObjects.MAX_BYTES));
        } catch (NoSuchKeyException exception) {
            return Optional.empty();
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("Invalid stored image", exception);
        }
    }

    @Override
    public void deleteSocialMedia(String key) {
        delete(SocialMediaObjects.FOLDER, SocialMediaObjects.requireKey(key));
    }

    private void put(String folder, String filename, byte[] bytes) {
        budget.reserveWrite(bytes.length);
        writeOnce(folder, filename, bytes, "image/webp", () -> get(folder, filename).content());
    }

    private interface ExistingObject {
        InputStream open();
    }

    private void writeOnce(String folder, String filename, byte[] bytes, String contentType, ExistingObject existingObject) {
        try {
            r2.putObject(PutObjectRequest.builder().bucket(bucket).key(key(folder, filename))
                    .contentType(contentType).contentLength((long) bytes.length).ifNoneMatch("*").build(), RequestBody.fromBytes(bytes));
        } catch (S3Exception exception) {
            if (exception.statusCode() != PRECONDITION_FAILED) { throw exception; }
            // Publication can be retried after a database rollback, but a conflicting image must never be overwritten.
            try (var existing = existingObject.open()) {
                if (!Arrays.equals(bytes, existing.readAllBytes())) { throw new IllegalStateException("Image already exists with different content"); }
            } catch (IOException failure) { throw new IllegalStateException("Could not verify stored image", failure); }
        }
    }

    private StoredFile get(String folder, String filename) {
        return get(folder, filename, "image/webp", ImageOptimizationPort.Purpose.COVER.maxBytes());
    }

    private StoredFile get(String folder, String filename, String contentType, int maxBytes) {
        budget.reserveRead();
        try (var response = r2.getObject(GetObjectRequest.builder().bucket(bucket).key(key(folder, filename)).build())) {
            byte[] bytes = response.readNBytes(maxBytes + 1);
            if (bytes.length > maxBytes || !contentType.equals(response.response().contentType())) {
                throw new IllegalStateException("Invalid stored image");
            }
            FileStorageService.validateImageContent(bytes, contentType);
            return new StoredFile(new ByteArrayInputStream(bytes), contentType, bytes.length);
        } catch (IOException exception) { throw new IllegalStateException("Could not read stored image", exception); }
    }

    private void delete(String folder, String filename) {
        r2.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key(folder, filename)).build());
    }
}
