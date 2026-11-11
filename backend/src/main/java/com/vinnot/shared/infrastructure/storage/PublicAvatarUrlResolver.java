package com.vinnot.shared.infrastructure.storage;

import com.vinnot.shared.application.port.AvatarUrlResolver;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Objects;

/**
 * Makes stored upload paths absolute with the public API address. The address ends in {@code /api} and stored paths
 * start with {@code /api/uploads}, so the shared {@code /api} segment is written once. Absolute links (R2, Google,
 * Facebook) and any other value pass through unchanged.
 */
@Component
public class PublicAvatarUrlResolver implements AvatarUrlResolver {

    private static final String API_SEGMENT = "/api";

    private final String base;

    public PublicAvatarUrlResolver(@Value("${app.public-api-base-url}") String publicApiBaseUrl) {
        this.base = withoutTrailingSlashes(Objects.isNull(publicApiBaseUrl) ? "" : publicApiBaseUrl.trim());
    }

    @Override
    public String resolve(String storedUrl) {
        if (Objects.isNull(storedUrl) || storedUrl.isBlank()) {
            return null;
        }
        if (!storedUrl.startsWith("/") || storedUrl.startsWith("//")) {
            return storedUrl;
        }
        boolean sharedApiSegment = base.endsWith(API_SEGMENT) && storedUrl.startsWith(API_SEGMENT + "/");
        return base + (sharedApiSegment ? storedUrl.substring(API_SEGMENT.length()) : storedUrl);
    }

    private static String withoutTrailingSlashes(String value) {
        String result = value;
        while (result.endsWith("/")) {
            result = result.substring(0, result.length() - 1);
        }
        return result;
    }
}
