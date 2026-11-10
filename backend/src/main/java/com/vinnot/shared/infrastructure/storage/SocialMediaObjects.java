package com.vinnot.shared.infrastructure.storage;

import com.vinnot.shared.application.port.FileStoragePort.StoredFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Objects;
import java.util.regex.Pattern;

/** Key and content rules shared by every adapter that stores rendered social media (slides and hero images). */
final class SocialMediaObjects {
    static final String FOLDER = "social";
    static final String CLEANUP_KIND = "social-media-cleanup";
    static final int MAX_BYTES = 5 * 1024 * 1024;
    static final int MAX_KEY_LENGTH = 160;
    private static final Pattern KEY = Pattern.compile("[a-z0-9]+(?:[/-][a-z0-9]+)*\\.(?:jpg|png)");

    private SocialMediaObjects() {
    }

    /** Relative, lowercase, extension-typed keys; the pattern alone rules out traversal, empty and absolute paths. */
    static String requireKey(String key) {
        if (Objects.isNull(key) || key.length() > MAX_KEY_LENGTH || !KEY.matcher(key).matches()) {
            throw new IllegalArgumentException("Invalid social media key");
        }
        return key;
    }

    static String contentType(String key) {
        return requireKey(key).endsWith(".png") ? "image/png" : "image/jpeg";
    }

    /** Type allow-list, extension match, size cap, magic bytes and the shared pixel limit; nothing is decoded. */
    static void requireContent(String key, byte[] content, String contentType) {
        if (!"image/jpeg".equals(contentType) && !"image/png".equals(contentType)) {
            throw new IllegalArgumentException("Social media must be a JPEG or PNG image");
        }
        if (!contentType.equals(contentType(key))) {
            throw new IllegalArgumentException("Social media content type does not match the key extension");
        }
        if (Objects.isNull(content) || content.length == 0) {
            throw new IllegalArgumentException("File is empty");
        }
        if (content.length > MAX_BYTES) {
            throw new IllegalArgumentException("Social media file exceeds the 5MB limit");
        }
        FileStorageService.validateImageContent(content, contentType);
    }

    /** Re-validates bytes read back from storage so a tampered or foreign object is never served as ours. */
    static StoredFile verifiedRead(String key, byte[] bytes) {
        String contentType = contentType(key);
        try {
            requireContent(key, bytes, contentType);
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("Invalid stored social media", exception);
        }
        return new StoredFile(new ByteArrayInputStream(bytes), contentType, bytes.length);
    }

    static byte[] readAll(StoredFile file) {
        try (var content = file.content()) {
            return content.readAllBytes();
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
