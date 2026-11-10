package com.vinnot.shared.infrastructure.storage;

import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.shared.infrastructure.image.ImageResourceLimits;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.UUID;
import java.util.Objects;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Arrays;
import java.nio.file.FileAlreadyExistsException;

/**
 * Service for storing uploaded files on the local filesystem.
 * Implements {@link FileStoragePort} to decouple consumers from this concrete implementation.
 */
@Service("physicalFileStorage")
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "local", matchIfMissing = true)
public class FileStorageService implements FileStoragePort {

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp"
    );
    private static final long MAX_FILE_SIZE = ImageResourceLimits.MAX_BYTES;
    private static final byte[] JPEG_SIGNATURE =
            {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG_SIGNATURE =
            {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] GIF_87_SIGNATURE =
            "GIF87a".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] GIF_89_SIGNATURE =
            "GIF89a".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] RIFF_SIGNATURE =
            "RIFF".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] WEBP_SIGNATURE =
            "WEBP".getBytes(StandardCharsets.US_ASCII);
    private static final int WEBP_SIGNATURE_OFFSET = 8;

    @Value("${app.uploads.avatar-dir:uploads/avatars}")
    private String avatarDir;

    @Value("${app.uploads.wine-label-dir:uploads/wine-labels}")
    private String wineLabelDir;

    @Value("${app.uploads.wine-label-quarantine-dir:uploads/wine-label-quarantine}")
    private String wineLabelQuarantineDir;

    private Path coverStoragePath;
    private Path socialStoragePath;

    private Path avatarStoragePath;
    private Path wineLabelStoragePath;
    private Path wineLabelQuarantineStoragePath;

    @PostConstruct
    public void init() {
        avatarStoragePath = Paths.get(avatarDir).toAbsolutePath().normalize();
        wineLabelStoragePath = Paths.get(wineLabelDir).toAbsolutePath().normalize();
        wineLabelQuarantineStoragePath = Paths.get(wineLabelQuarantineDir)
                .toAbsolutePath().normalize();
        coverStoragePath = avatarStoragePath.getParent().resolve("covers");
        socialStoragePath = avatarStoragePath.getParent().resolve(SocialMediaObjects.FOLDER);
        try {
            Files.createDirectories(coverStoragePath);
            Files.createDirectories(socialStoragePath);
            Files.createDirectories(avatarStoragePath);
            Files.createDirectories(wineLabelStoragePath);
            Files.createDirectories(wineLabelQuarantineStoragePath);
        } catch (IOException e) {
            throw new RuntimeException("Could not create avatar upload directory: " + avatarDir, e);
        }
    }

    @Override
    public void storeCover(InputStream content, long size, UUID id) {
        validateImageFile("image/webp", size);
        try {
            byte[] bytes = readImageContent(content);
            validateImageContent(bytes, "image/webp");
            Files.write(coverStoragePath.resolve(id + ".webp"), bytes, StandardOpenOption.CREATE_NEW);
        } catch (IOException exception) { throw new IllegalStateException("Could not store cover image", exception); }
    }

    @Override
    public StoredFile loadCover(UUID id) {
        try {
            byte[] bytes = Files.readAllBytes(coverStoragePath.resolve(id + ".webp"));
            return new StoredFile(new ByteArrayInputStream(bytes), "image/webp", bytes.length);
        } catch (IOException exception) { throw new IllegalArgumentException("Cover image not found", exception); }
    }

    @Override
    public void deleteCover(UUID id) {
        try { Files.deleteIfExists(coverStoragePath.resolve(id + ".webp")); }
        catch (IOException exception) { throw new IllegalStateException("Could not delete cover image", exception); }
    }

    @Override
    public String storeSocialMedia(String key, byte[] content, String contentType) {
        Path target = socialPath(key);
        SocialMediaObjects.requireContent(key, content, contentType);
        try {
            Files.createDirectories(target.getParent());
            // A temporary sibling keeps a crash from leaving a truncated object under the final, write-once key.
            Path temporary = Files.createTempFile(target.getParent(), ".upload-", ".tmp");
            try {
                Files.write(temporary, content);
                Files.move(temporary, target);
            } catch (FileAlreadyExistsException exception) {
                if (!Arrays.equals(content, Files.readAllBytes(target))) {
                    throw new IllegalStateException("Image already exists with different content");
                }
            } finally {
                Files.deleteIfExists(temporary);
            }
            return "/api/uploads/social/" + key;
        } catch (IOException exception) {
            throw new IllegalStateException("Could not store social media", exception);
        }
    }

    @Override
    public Optional<StoredFile> loadSocialMedia(String key) {
        Path source = socialPath(key);
        try {
            if (!Files.isRegularFile(source)) {
                return Optional.empty();
            }
            if (Files.size(source) > SocialMediaObjects.MAX_BYTES) {
                throw new IllegalStateException("Invalid stored social media");
            }
            return Optional.of(SocialMediaObjects.verifiedRead(key, Files.readAllBytes(source)));
        } catch (IOException exception) {
            throw new IllegalStateException("Could not read social media", exception);
        }
    }

    @Override
    public void deleteSocialMedia(String key) {
        try {
            Files.deleteIfExists(socialPath(key));
        } catch (IOException exception) {
            throw new IllegalStateException("Could not delete social media", exception);
        }
    }

    private Path socialPath(String key) {
        Path target = socialStoragePath.resolve(SocialMediaObjects.requireKey(key)).normalize();
        if (!target.startsWith(socialStoragePath)) {
            throw new IllegalArgumentException("Invalid social media key");
        }
        return target;
    }

    /**
     * Stores an avatar image from a MultipartFile (convenience method).
     *
     * @param file   the uploaded file
     * @param userId the user ID
     * @return the relative URL path to the stored file
     */
    public String storeAvatar(MultipartFile file, UUID userId) {
        try {
            return storeAvatar(file.getInputStream(), file.getOriginalFilename(),
                    file.getContentType(), file.getSize(), userId);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read uploaded file", e);
        }
    }

    @Override
    public String storeAvatar(InputStream content, String originalFilename,
                              String contentType, long size, UUID userId) {
        validateImageFile(contentType, size);

        try {
            byte[] bytes = readImageContent(content);
            String detectedContentType = validateImageContent(bytes, contentType);
            String extension = getFileExtension(detectedContentType);
            String filename = avatarFilename(userId, extension);
            Path targetPath = avatarStoragePath.resolve(filename).normalize();
            if (!targetPath.getParent().equals(avatarStoragePath)) {
                throw new IllegalArgumentException("Invalid file path");
            }
            Files.copy(new ByteArrayInputStream(bytes), targetPath,
                    StandardCopyOption.REPLACE_EXISTING);
            return "/api/uploads/avatars/" + filename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store avatar file", e);
        }
    }

    @Override
    public StoredFile loadAvatar(String filename) {
        String safeFilename = sanitizeFilename(filename);
        Path targetPath = avatarStoragePath.resolve(safeFilename).normalize();
        if (!targetPath.getParent().equals(avatarStoragePath)) {
            throw new IllegalArgumentException("Invalid file path");
        }
        if (!Files.exists(targetPath)) {
            throw new IllegalArgumentException("Avatar file not found");
        }

        try {
            byte[] bytes = Files.readAllBytes(targetPath);
            String contentType = Files.probeContentType(targetPath);
            return new StoredFile(
                    new ByteArrayInputStream(bytes),
                    Objects.requireNonNullElse(contentType, "application/octet-stream"),
                    bytes.length);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read avatar file", e);
        }
    }

    @Override
    public void deleteAvatar(String avatarUrl, UUID userId) {
        String filename = ownedAvatarFilename(avatarUrl, userId);
        Path targetPath = avatarStoragePath.resolve(filename).normalize();
        if (!targetPath.getParent().equals(avatarStoragePath)) {
            throw new IllegalArgumentException("Invalid file path");
        }
        try {
            Files.deleteIfExists(targetPath);
        } catch (IOException exception) {
            throw new RuntimeException("Failed to delete avatar file", exception);
        }
    }

    @Override
    public String storeWineLabel(
            InputStream content, String originalFilename, String contentType,
            long size, UUID submissionId) {
        validateImageFile(contentType, size);
        try {
            byte[] bytes = readImageContent(content);
            String detectedContentType = validateImageContent(bytes, contentType);
            String filename = "wine_label_" + submissionId
                    + getFileExtension(detectedContentType);
            Path targetPath = wineLabelStoragePath.resolve(filename).normalize();
            if (!targetPath.getParent().equals(wineLabelStoragePath)) {
                throw new IllegalArgumentException("Invalid file path");
            }
            Files.copy(new ByteArrayInputStream(bytes), targetPath,
                    StandardCopyOption.REPLACE_EXISTING);
            return "/api/uploads/wine-labels/" + filename;
        } catch (IOException exception) {
            throw new RuntimeException("Failed to store wine-label file", exception);
        }
    }

    @Override
    public StoredFile loadWineLabel(String filename) {
        String safeFilename = sanitizeFilename(filename);
        Path targetPath = wineLabelStoragePath.resolve(safeFilename).normalize();
        if (!targetPath.getParent().equals(wineLabelStoragePath)
                || !Files.exists(targetPath)) {
            throw new IllegalArgumentException("Wine-label file not found");
        }
        try {
            byte[] bytes = Files.readAllBytes(targetPath);
            String contentType = Files.probeContentType(targetPath);
            return new StoredFile(
                    new ByteArrayInputStream(bytes),
                    Objects.requireNonNullElse(contentType, "application/octet-stream"),
                    bytes.length);
        } catch (IOException exception) {
            throw new RuntimeException("Failed to read wine-label file", exception);
        }
    }

    @Override
    public String storeQuarantinedWineLabel(
            InputStream content, String originalFilename, String contentType,
            long size, UUID submissionId) {
        validateImageFile(contentType, size);
        try {
            byte[] bytes = readImageContent(content);
            String detectedContentType = validateImageContent(bytes, contentType);
            String filename = wineLabelFilename(submissionId, detectedContentType);
            Path targetPath = wineLabelQuarantineStoragePath.resolve(filename).normalize();
            requireDirectChild(targetPath, wineLabelQuarantineStoragePath);
            Files.copy(new ByteArrayInputStream(bytes), targetPath,
                    StandardCopyOption.REPLACE_EXISTING);
            return "/api/admin/wine-submissions/" + submissionId + "/image";
        } catch (IOException exception) {
            throw new RuntimeException("Failed to quarantine wine-label file", exception);
        }
    }

    @Override
    public StoredFile loadQuarantinedWineLabel(UUID submissionId) {
        Path source = findWineLabel(wineLabelQuarantineStoragePath, submissionId);
        try {
            byte[] bytes = Files.readAllBytes(source);
            String contentType = Files.probeContentType(source);
            return new StoredFile(new ByteArrayInputStream(bytes),
                    Objects.requireNonNullElse(contentType, "application/octet-stream"),
                    bytes.length);
        } catch (IOException exception) {
            throw new RuntimeException("Failed to read quarantined wine label", exception);
        }
    }

    @Override
    public String promoteQuarantinedWineLabel(UUID submissionId) {
        Path source = findWineLabel(wineLabelQuarantineStoragePath, submissionId);
        Path target = wineLabelStoragePath.resolve(source.getFileName()).normalize();
        requireDirectChild(target, wineLabelStoragePath);
        try {
            Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING);
            return "/api/uploads/wine-labels/" + target.getFileName();
        } catch (IOException exception) {
            throw new RuntimeException("Failed to promote quarantined wine label", exception);
        }
    }

    @Override
    public List<String> listAvatarUrls(UUID userId, Instant olderThan) {
        String prefix = "avatar_" + userId + "_";
        try (var files = Files.list(avatarStoragePath)) {
            List<String> urls = new ArrayList<>();
            for (Path path : files.filter(value -> value.getFileName().toString().startsWith(prefix)).toList()) {
                if (Files.getLastModifiedTime(path).toInstant().isBefore(olderThan)) {
                    urls.add("/api/uploads/avatars/" + path.getFileName());
                }
            }
            return urls;
        } catch (IOException exception) {
            throw new IllegalStateException("Could not inspect managed avatars", exception);
        }
    }

    @Override
    public void deletePublicWineLabel(UUID submissionId) {
        deleteWineLabelIfPresent(wineLabelStoragePath, submissionId);
    }

    @Override
    public void deleteWineLabel(UUID submissionId) {
        deleteWineLabelIfPresent(wineLabelStoragePath, submissionId);
        deleteWineLabelIfPresent(wineLabelQuarantineStoragePath, submissionId);
    }

    @Override
    public void deleteQuarantinedWineLabel(UUID submissionId) {
        deleteWineLabelIfPresent(wineLabelQuarantineStoragePath, submissionId);
    }

    private Path findWineLabel(Path directory, UUID submissionId) {
        String prefix = "wine_label_" + submissionId + ".";
        try (var files = Files.list(directory)) {
            return files.filter(path -> path.getFileName().toString().startsWith(prefix))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Wine-label file not found"));
        } catch (IOException exception) {
            throw new RuntimeException("Failed to locate wine-label file", exception);
        }
    }

    private void deleteWineLabelIfPresent(Path directory, UUID submissionId) {
        String prefix = "wine_label_" + submissionId + ".";
        try (var files = Files.list(directory)) {
            files.filter(path -> path.getFileName().toString().startsWith(prefix))
                    .forEach(path -> {
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException exception) {
                            throw new RuntimeException("Failed to delete wine-label file", exception);
                        }
                    });
        } catch (IOException exception) {
            throw new RuntimeException("Failed to locate wine-label file", exception);
        }
    }

    private void requireDirectChild(Path target, Path parent) {
        if (!target.getParent().equals(parent)) {
            throw new IllegalArgumentException("Invalid file path");
        }
    }

    private String wineLabelFilename(UUID submissionId, String contentType) {
        return "wine_label_" + submissionId + getFileExtension(contentType);
    }

    static void validateImageFile(String contentType, long size) {
        if (size <= 0) {
            throw new IllegalArgumentException("File is empty");
        }
        if (size > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds maximum allowed size of 8MB");
        }
        if (Objects.isNull(contentType) || !ALLOWED_IMAGE_TYPES.contains(contentType)) {
            throw new IllegalArgumentException(
                    "Invalid file type. Allowed types: JPEG, PNG, GIF, WebP"
            );
        }
    }

    static String validateImageContent(byte[] bytes, String declaredContentType) {
        if (Objects.isNull(bytes) || bytes.length == 0) {
            throw new IllegalArgumentException("File is empty");
        }
        validateImageFile(declaredContentType, bytes.length);
        String detected = detectImageContentType(bytes);
        if (Objects.isNull(detected)) {
            throw new IllegalArgumentException(
                    "File content is not a valid JPEG, PNG, GIF, or WebP image");
        }
        if (!detected.equals(declaredContentType)
                && !("image/jpeg".equals(detected) && "image/jpg".equals(declaredContentType))) {
            throw new IllegalArgumentException("Declared file type does not match file content");
        }
        ImageResourceLimits.validateDimensions(bytes);
        return detected;
    }

    /** Bounds the actual stream, independently of the client-supplied size. */
    static byte[] readImageContent(InputStream content) throws IOException {
        return ImageResourceLimits.readBounded(content);
    }

    private static String detectImageContentType(byte[] bytes) {
        if (startsWith(bytes, JPEG_SIGNATURE)) {
            return "image/jpeg";
        }
        if (startsWith(bytes, PNG_SIGNATURE)) {
            return "image/png";
        }
        if (startsWith(bytes, GIF_87_SIGNATURE)
                || startsWith(bytes, GIF_89_SIGNATURE)) {
            return "image/gif";
        }
        if (startsWith(bytes, RIFF_SIGNATURE)
                && matchesAt(bytes, WEBP_SIGNATURE_OFFSET, WEBP_SIGNATURE)) {
            return "image/webp";
        }
        return null;
    }

    private static boolean startsWith(byte[] bytes, byte[] signature) {
        return matchesAt(bytes, 0, signature);
    }

    private static boolean matchesAt(byte[] bytes, int offset, byte[] signature) {
        if (bytes.length < offset + signature.length) {
            return false;
        }
        for (int index = 0; index < signature.length; index++) {
            if (bytes[offset + index] != signature[index]) {
                return false;
            }
        }
        return true;
    }

    static String getFileExtension(String contentType) {
        return switch (Objects.requireNonNullElse(contentType, "")) {
            case "image/png" -> ".png";
            case "image/gif" -> ".gif";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }

    static String sanitizeFilename(String filename) {
        if (Objects.isNull(filename) || filename.isBlank()) {
            throw new IllegalArgumentException("Filename is required");
        }
        String safeFilename = Path.of(filename).getFileName().toString();
        if (!safeFilename.equals(filename) || safeFilename.contains("..")) {
            throw new IllegalArgumentException("Invalid filename");
        }
        return safeFilename;
    }

    /** True when the URL names an avatar file this service stored for the user (not an external picture). */
    static boolean isOwnedAvatarUrl(String avatarUrl, UUID userId) {
        if (Objects.isNull(avatarUrl) || avatarUrl.isBlank()) {
            return false;
        }
        return avatarUrl.substring(avatarUrl.lastIndexOf('/') + 1).startsWith("avatar_" + userId + "_");
    }

    static String ownedAvatarFilename(String avatarUrl, UUID userId) {
        if (Objects.isNull(avatarUrl) || avatarUrl.isBlank()) {
            throw new IllegalArgumentException("Avatar URL is required");
        }
        String filename = sanitizeFilename(
                avatarUrl.substring(avatarUrl.lastIndexOf('/') + 1));
        if (!filename.startsWith("avatar_" + userId + "_")) {
            throw new IllegalArgumentException("Avatar does not belong to user");
        }
        return filename;
    }

    private static String avatarFilename(UUID userId, String extension) {
        return "avatar_" + userId + "_" + UUID.randomUUID() + extension;
    }
}
