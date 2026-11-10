package com.vinnot.shared.infrastructure.storage;

import com.vinnot.shared.application.port.FileStoragePort;
import software.amazon.awssdk.core.ResponseBytes;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.core.sync.ResponseTransformer;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.CopyObjectRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ServerSideEncryption;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Objects;
import java.util.UUID;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Arrays;

/**
 * Stores uploaded files in a private S3 bucket and serves them back through the backend.
 */
@Service("physicalFileStorage")
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "s3")
public class S3FileStorageService implements FileStoragePort {

    private static final int PRECONDITION_FAILED = 412;

    private final S3Client s3Client;
    private final String bucket;
    private final String avatarPrefix;
    private final String wineLabelPrefix;
    private final String wineLabelQuarantinePrefix;

    public S3FileStorageService(
            S3Client s3Client,
            @Value("${app.storage.s3.bucket}") String bucket,
            @Value("${app.storage.s3.avatar-prefix:avatars}") String avatarPrefix,
            @Value("${app.storage.s3.wine-label-prefix:wine-labels}")
            String wineLabelPrefix,
            @Value("${app.storage.s3.wine-label-quarantine-prefix:"
                    + "wine-label-quarantine}") String wineLabelQuarantinePrefix) {
        this.bucket = requireNonBlank(bucket, "app.storage.s3.bucket");
        this.avatarPrefix = normalizePrefix(avatarPrefix);
        this.wineLabelPrefix = normalizePrefix(wineLabelPrefix);
        this.wineLabelQuarantinePrefix = normalizePrefix(wineLabelQuarantinePrefix);
        this.s3Client = s3Client;
    }

    @Override
    public void storeCover(InputStream content, long size, UUID id) {
        FileStorageService.validateImageFile("image/webp", size);
        try {
            byte[] bytes = FileStorageService.readImageContent(content);
            FileStorageService.validateImageContent(bytes, "image/webp");
            s3Client.putObject(PutObjectRequest.builder().bucket(bucket).key("covers/" + id + ".webp")
                    .contentType("image/webp").contentLength((long) bytes.length).ifNoneMatch("*")
                    .serverSideEncryption(ServerSideEncryption.AES256).build(), RequestBody.fromBytes(bytes));
        } catch (IOException exception) { throw new IllegalStateException("Could not store cover image", exception); }
    }

    @Override
    public StoredFile loadCover(UUID id) {
        var response = s3Client.getObject(GetObjectRequest.builder().bucket(bucket).key("covers/" + id + ".webp").build(), ResponseTransformer.toBytes());
        byte[] bytes = response.asByteArray();
        return new StoredFile(new ByteArrayInputStream(bytes), "image/webp", bytes.length);
    }

    @Override
    public void deleteCover(UUID id) {
        s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key("covers/" + id + ".webp").build());
    }

    /** Write-once like covers: a retry with equal bytes is accepted, different bytes never overwrite the object. */
    @Override
    public String storeSocialMedia(String key, byte[] content, String contentType) {
        SocialMediaObjects.requireContent(key, content, contentType);
        try {
            s3Client.putObject(PutObjectRequest.builder().bucket(bucket).key(socialKey(key))
                    .contentType(contentType).contentLength((long) content.length).ifNoneMatch("*")
                    .serverSideEncryption(ServerSideEncryption.AES256).build(), RequestBody.fromBytes(content));
        } catch (S3Exception exception) {
            if (exception.statusCode() != PRECONDITION_FAILED) {
                throw exception;
            }
            byte[] existing = loadSocialMedia(key).map(SocialMediaObjects::readAll)
                    .orElseThrow(() -> new IllegalStateException("Could not verify stored image"));
            if (!Arrays.equals(content, existing)) {
                throw new IllegalStateException("Image already exists with different content");
            }
        }
        return "/api/uploads/social/" + key;
    }

    @Override
    public Optional<StoredFile> loadSocialMedia(String key) {
        String objectKey = socialKey(key);
        try (var response = s3Client.getObject(GetObjectRequest.builder().bucket(bucket).key(objectKey).build())) {
            byte[] bytes = response.readNBytes(SocialMediaObjects.MAX_BYTES + 1);
            if (bytes.length > SocialMediaObjects.MAX_BYTES) {
                throw new IllegalStateException("Invalid stored social media");
            }
            return Optional.of(SocialMediaObjects.verifiedRead(key, bytes));
        } catch (NoSuchKeyException exception) {
            return Optional.empty();
        } catch (IOException exception) {
            throw new IllegalStateException("Could not read social media", exception);
        }
    }

    @Override
    public void deleteSocialMedia(String key) {
        s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(socialKey(key)).build());
    }

    private static String socialKey(String key) {
        return SocialMediaObjects.FOLDER + "/" + SocialMediaObjects.requireKey(key);
    }

    @Override
    public String storeAvatar(InputStream content, String originalFilename,
                              String contentType, long size, UUID userId) {
        FileStorageService.validateImageFile(contentType, size);

        try {
            byte[] bytes = FileStorageService.readImageContent(content);
            String detectedContentType =
                    FileStorageService.validateImageContent(bytes, contentType);
            String extension = FileStorageService.getFileExtension(detectedContentType);
            String filename = "avatar_" + userId + "_" + UUID.randomUUID() + extension;
            String key = avatarPrefix + "/" + filename;
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(detectedContentType)
                    .contentLength((long) bytes.length)
                    .serverSideEncryption(ServerSideEncryption.AES256)
                    .build();
            s3Client.putObject(request, RequestBody.fromBytes(bytes));
            return "/api/uploads/avatars/" + filename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to read avatar file", e);
        }
    }

    @Override
    public StoredFile loadAvatar(String filename) {
        String safeFilename = FileStorageService.sanitizeFilename(filename);
        String key = avatarPrefix + "/" + safeFilename;
        GetObjectRequest request = GetObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build();

        try {
            ResponseBytes<GetObjectResponse> response = s3Client.getObject(
                    request, ResponseTransformer.toBytes());
            String contentType = Objects.requireNonNullElse(
                    response.response().contentType(), "application/octet-stream");
            return new StoredFile(
                    new ByteArrayInputStream(response.asByteArray()),
                    contentType,
                    response.asByteArray().length);
        } catch (NoSuchKeyException e) {
            throw new IllegalArgumentException("Avatar file not found", e);
        }
    }

    @Override
    public void deleteAvatar(String avatarUrl, UUID userId) {
        String filename = FileStorageService.ownedAvatarFilename(avatarUrl, userId);
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(avatarPrefix + "/" + filename)
                .build());
    }

    @Override
    public String storeWineLabel(
            InputStream content, String originalFilename, String contentType,
            long size, UUID submissionId) {
        FileStorageService.validateImageFile(contentType, size);
        try {
            byte[] bytes = FileStorageService.readImageContent(content);
            String detectedContentType =
                    FileStorageService.validateImageContent(bytes, contentType);
            String filename = "wine_label_" + submissionId
                    + FileStorageService.getFileExtension(detectedContentType);
            s3Client.putObject(PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(wineLabelPrefix + "/" + filename)
                            .contentType(detectedContentType)
                            .contentLength((long) bytes.length)
                            .serverSideEncryption(ServerSideEncryption.AES256)
                            .build(),
                    RequestBody.fromBytes(bytes));
            return "/api/uploads/wine-labels/" + filename;
        } catch (IOException exception) {
            throw new RuntimeException("Failed to read wine-label file", exception);
        }
    }

    @Override
    public StoredFile loadWineLabel(String filename) {
        String safeFilename = FileStorageService.sanitizeFilename(filename);
        try {
            ResponseBytes<GetObjectResponse> response = s3Client.getObject(
                    GetObjectRequest.builder()
                            .bucket(bucket)
                            .key(wineLabelPrefix + "/" + safeFilename)
                            .build(),
                    ResponseTransformer.toBytes());
            byte[] bytes = response.asByteArray();
            return new StoredFile(
                    new ByteArrayInputStream(bytes),
                    Objects.requireNonNullElse(
                            response.response().contentType(), "application/octet-stream"),
                    bytes.length);
        } catch (NoSuchKeyException exception) {
            throw new IllegalArgumentException("Wine-label file not found", exception);
        }
    }

    @Override
    public String storeQuarantinedWineLabel(
            InputStream content, String originalFilename, String contentType,
            long size, UUID submissionId) {
        FileStorageService.validateImageFile(contentType, size);
        try {
            byte[] bytes = FileStorageService.readImageContent(content);
            String detected = FileStorageService.validateImageContent(bytes, contentType);
            String filename = wineLabelFilename(submissionId, detected);
            putWineLabel(wineLabelQuarantinePrefix + "/" + filename, bytes, detected);
            return "/api/admin/wine-submissions/" + submissionId + "/image";
        } catch (IOException exception) {
            throw new RuntimeException("Failed to quarantine wine-label file", exception);
        }
    }

    @Override
    public StoredFile loadQuarantinedWineLabel(UUID submissionId) {
        String key = findWineLabelKey(wineLabelQuarantinePrefix, submissionId);
        try {
            ResponseBytes<GetObjectResponse> response = s3Client.getObject(
                    GetObjectRequest.builder().bucket(bucket).key(key).build(),
                    ResponseTransformer.toBytes());
            byte[] bytes = response.asByteArray();
            return new StoredFile(new ByteArrayInputStream(bytes),
                    Objects.requireNonNullElse(
                            response.response().contentType(), "application/octet-stream"),
                    bytes.length);
        } catch (NoSuchKeyException exception) {
            throw new IllegalArgumentException("Wine-label file not found", exception);
        }
    }

    @Override
    public String promoteQuarantinedWineLabel(UUID submissionId) {
        String sourceKey = findWineLabelKey(wineLabelQuarantinePrefix, submissionId);
        String filename = sourceKey.substring(sourceKey.lastIndexOf('/') + 1);
        String targetKey = wineLabelPrefix + "/" + filename;
        s3Client.copyObject(CopyObjectRequest.builder()
                .copySource(bucket + "/" + sourceKey)
                .destinationBucket(bucket)
                .destinationKey(targetKey)
                .build());
        return "/api/uploads/wine-labels/" + filename;
    }

    @Override
    public List<String> listAvatarUrls(UUID userId, Instant olderThan) {
        var request = ListObjectsV2Request.builder()
                .bucket(bucket).prefix(avatarPrefix + "/avatar_" + userId + "_").build();
        return s3Client.listObjectsV2Paginator(request).contents().stream()
                .filter(object -> object.lastModified().isBefore(olderThan))
                .map(object -> "/api/uploads/avatars/" + object.key().substring(object.key().lastIndexOf('/') + 1))
                .toList();
    }

    @Override
    public void deletePublicWineLabel(UUID submissionId) {
        deleteWineLabelIfPresent(wineLabelPrefix, submissionId);
    }

    @Override
    public void deleteWineLabel(UUID submissionId) {
        deleteWineLabelIfPresent(wineLabelPrefix, submissionId);
        deleteWineLabelIfPresent(wineLabelQuarantinePrefix, submissionId);
    }

    @Override
    public void deleteQuarantinedWineLabel(UUID submissionId) {
        deleteWineLabelIfPresent(wineLabelQuarantinePrefix, submissionId);
    }

    private void putWineLabel(String key, byte[] bytes, String contentType) {
        s3Client.putObject(PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .contentType(contentType)
                        .contentLength((long) bytes.length)
                        .serverSideEncryption(ServerSideEncryption.AES256)
                        .build(),
                RequestBody.fromBytes(bytes));
    }

    private String findWineLabelKey(String prefix, UUID submissionId) {
        String keyPrefix = prefix + "/wine_label_" + submissionId + ".";
        return s3Client.listObjectsV2(ListObjectsV2Request.builder()
                        .bucket(bucket).prefix(keyPrefix).maxKeys(1).build())
                .contents().stream()
                .findFirst()
                .map(object -> object.key())
                .orElseThrow(() -> new IllegalArgumentException("Wine-label file not found"));
    }

    private void deleteWineLabelIfPresent(String prefix, UUID submissionId) {
        String keyPrefix = prefix + "/wine_label_" + submissionId + ".";
        s3Client.listObjectsV2(ListObjectsV2Request.builder()
                        .bucket(bucket).prefix(keyPrefix).build())
                .contents()
                .forEach(object -> s3Client.deleteObject(DeleteObjectRequest.builder()
                        .bucket(bucket).key(object.key()).build()));
    }

    private String wineLabelFilename(UUID submissionId, String contentType) {
        return "wine_label_" + submissionId
                + FileStorageService.getFileExtension(contentType);
    }

    private static String requireNonBlank(String value, String propertyName) {
        if (Objects.isNull(value) || value.isBlank()) {
            throw new IllegalStateException(propertyName + " is required when S3 storage is enabled");
        }
        return value;
    }

    private static String normalizePrefix(String prefix) {
        String normalized = requireNonBlank(prefix, "app.storage.s3.avatar-prefix")
                .replaceAll("^/+", "")
                .replaceAll("/+$", "");
        return normalized.isBlank() ? "avatars" : normalized;
    }
}
