package com.vinnot.shared.application.port;

import java.util.List;
import java.util.UUID;

public interface TokenService {

    String generateAccessToken(UUID userId, String email, List<String> roles);

    /** Generates an access token including granular permission codes. */
    String generateAccessToken(UUID userId, String email, List<String> roles, List<String> permissions);

    String generateAccessToken(UUID userId, String email, List<String> roles, List<String> permissions, long sessionVersion);

    long extractSessionVersion(String token);

    String generateRefreshToken();

    /** Reproduces one successor for a durable client rotation, without storing raw credentials. */
    String deriveRefreshToken(String previousRefreshToken, UUID rotationId);

    /** Returns the access-token lifetime in milliseconds. */
    long getAccessTokenExpiration();

    /** Returns the refresh-token lifetime in milliseconds. */
    long getRefreshTokenExpiration();

    UUID extractUserId(String token);

    String extractEmail(String token);

    List<String> extractRoles(String token);

    /** Extracts permission codes from a JWT token. */
    List<String> extractPermissions(String token);

    boolean validateToken(String token);

    boolean isTokenExpired(String token);
}
