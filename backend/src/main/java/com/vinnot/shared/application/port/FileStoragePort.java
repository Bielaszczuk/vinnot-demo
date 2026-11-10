package com.vinnot.shared.application.port;

import java.io.InputStream;
import java.util.UUID;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface FileStoragePort {

    record StoredFile(InputStream content, String contentType, long size) {
    }

    /**
     * Stores an avatar image and returns the relative URL path.
     *
     * @param content          the file input stream
     * @param originalFilename the original filename
     * @param contentType      the MIME content type
     * @param size             the file size in bytes
     * @param userId           the user ID (used for unique naming)
     * @return the relative URL path to the stored file
     */
    String storeAvatar(InputStream content, String originalFilename,
                       String contentType, long size, UUID userId);

    /**
     * Loads a stored avatar image by filename.
     *
     * @param filename the stored avatar filename
     * @return the stored avatar content and metadata
     */
    StoredFile loadAvatar(String filename);

    /**
     * Deletes an avatar only when the stored object belongs to the supplied user.
     *
     * @param avatarUrl the managed avatar URL returned by this port
     * @param userId    the owner of the avatar
     */
    void deleteAvatar(String avatarUrl, UUID userId);

    /** Managed avatars owned by this user and older than the reconciliation grace period. */
    List<String> listAvatarUrls(UUID userId, Instant olderThan);

    /**
     * Stores a moderated wine-label image under an immutable submission key.
     */
    String storeWineLabel(InputStream content, String originalFilename,
                          String contentType, long size, UUID submissionId);

    /**
     * Loads a managed wine-label image by filename.
     */
    StoredFile loadWineLabel(String filename);

    /** Stores a label that must remain private until an administrator decides it. */
    String storeQuarantinedWineLabel(InputStream content, String originalFilename,
                                     String contentType, long size, UUID submissionId);

    /** Loads a quarantined label by submission ID for an authorized admin endpoint. */
    StoredFile loadQuarantinedWineLabel(UUID submissionId);

    /** Promotes a quarantined label into the public catalog-label namespace. */
    String promoteQuarantinedWineLabel(UUID submissionId);

    /** Deletes only the private review copy after a terminal decision. */
    void deleteQuarantinedWineLabel(UUID submissionId);

    /** Deletes any public or quarantined label owned by the supplied submission. */
    void deleteWineLabel(UUID submissionId);

    void deletePublicWineLabel(UUID submissionId);

    default void storeCover(InputStream content, long size, UUID id) {
        throw new UnsupportedOperationException("Cover storage is not supported");
    }

    default StoredFile loadCover(UUID id) {
        throw new UnsupportedOperationException("Cover storage is not supported");
    }

    default void deleteCover(UUID id) {
        throw new UnsupportedOperationException("Cover storage is not supported");
    }

    /**
     * Stores a rendered social-media image (carousel slide or hero illustration) and returns its public URL.
     *
     * <p>Keys are relative, lowercase and versioned, for example {@code posts/<post-id>/ig-01-<content-hash>.jpg}:
     * segments of {@code [a-z0-9]} joined by {@code /} or {@code -}, ending in {@code .jpg} or {@code .png}, at most
     * 160 characters. Only {@code image/jpeg} and {@code image/png} up to 5 MB are accepted; the declared type must
     * match both the key extension and the file signature. Objects are write-once: storing the same bytes under an
     * existing key is idempotent, and different bytes under an existing key are rejected, so callers must derive keys
     * from the content (or a render version) instead of rewriting a key.
     */
    String storeSocialMedia(String key, byte[] content, String contentType);

    /** Loads a stored social-media image; empty when the key holds no object. */
    Optional<StoredFile> loadSocialMedia(String key);

    /** Deletes a stored social-media image; deleting a missing key is not an error. */
    void deleteSocialMedia(String key);

    /** Managed reference patterns used by reconciliation, including legacy references after provider migration. */
    default String publicWineLabelUrlPattern(UUID submissionId) {
        return "/api/uploads/wine-labels/wine_label_" + submissionId + ".%";
    }
}
