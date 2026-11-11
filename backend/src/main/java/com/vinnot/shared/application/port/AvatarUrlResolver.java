package com.vinnot.shared.application.port;

/**
 * Turns a stored profile photo value into the URL clients load. Every response that carries an avatar goes through it.
 * Local and S3 storage keep a relative {@code /api/uploads/...} path, R2 and social sign-in keep an absolute link.
 */
public interface AvatarUrlResolver {

    /**
     * @param storedUrl the value kept in {@code users.profile_image_url}
     * @return an absolute URL for a relative path, any other value unchanged, {@code null} for a missing or blank value
     */
    String resolve(String storedUrl);
}
