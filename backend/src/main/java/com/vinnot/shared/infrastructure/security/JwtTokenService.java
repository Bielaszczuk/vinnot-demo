package com.vinnot.shared.infrastructure.security;

import com.vinnot.shared.application.port.TokenService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.GeneralSecurityException;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Component
public class JwtTokenService implements TokenService {

    private static final int REFRESH_TOKEN_BYTES = 32;

    private final SecretKey secretKey;
    private final SecureRandom secureRandom = new SecureRandom();
    private final long accessTokenExpiration;
    private final long refreshTokenExpiration;

    /**
     * Constructor.
     *
     * @param secret              the JWT secret key
     * @param accessExpiration    the access token expiration in milliseconds
     * @param refreshExpiration   the refresh token expiration in milliseconds
     */
    public JwtTokenService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration}") long accessExpiration,
            @Value("${jwt.refresh-expiration}") long refreshExpiration) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpiration = accessExpiration;
        this.refreshTokenExpiration = refreshExpiration;
    }

    /**
     * Generates an access token for the given user.
     *
     * @param userId the user ID
     * @param email  the user email
     * @param roles  the user roles
     * @return the JWT access token
     */
    @Override
    public String generateAccessToken(UUID userId, String email, List<String> roles) {
        return generateAccessToken(userId, email, roles, List.of());
    }

    @Override
    public String generateAccessToken(UUID userId, String email, List<String> roles, List<String> permissions) {
        return generateAccessToken(userId, email, roles, permissions, 0);
    }

    @Override
    public String generateAccessToken(UUID userId, String email, List<String> roles, List<String> permissions, long sessionVersion) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .claim("roles", roles)
                .claim("permissions", permissions)
                .claim("sessionVersion", sessionVersion)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(accessTokenExpiration)))
                .signWith(secretKey)
                .compact();
    }

    @Override
    public long extractSessionVersion(String token) {
        Number version = extractClaims(token).get("sessionVersion", Number.class);
        return Objects.isNull(version) ? 0 : version.longValue();
    }

    /**
     * Generates a refresh token string.
     *
     * @return a unique refresh token string
     */
    @Override
    public String generateRefreshToken() {
        byte[] tokenBytes = new byte[REFRESH_TOKEN_BYTES];
        secureRandom.nextBytes(tokenBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
    }

    @Override
    public String deriveRefreshToken(String previousRefreshToken, UUID rotationId) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretKey.getEncoded(), "HmacSHA256"));
            String input = "vinnot:refresh-rotation:v1:" + rotationId + ":" + previousRefreshToken;
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(input.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Refresh-token derivation unavailable", exception);
        }
    }

    @Override
    public long getAccessTokenExpiration() {
        return accessTokenExpiration;
    }

    /**
     * Gets the refresh token expiration in milliseconds.
     *
     * @return the refresh token expiration
     */
    @Override
    public long getRefreshTokenExpiration() {
        return refreshTokenExpiration;
    }

    /**
     * Extracts the user ID from a JWT token.
     *
     * @param token the JWT token
     * @return the user ID
     */
    @Override
    public UUID extractUserId(String token) {
        Claims claims = extractClaims(token);
        return UUID.fromString(claims.getSubject());
    }

    /**
     * Extracts the email from a JWT token.
     *
     * @param token the JWT token
     * @return the email
     */
    @Override
    public String extractEmail(String token) {
        Claims claims = extractClaims(token);
        return claims.get("email", String.class);
    }

    /**
     * Extracts roles from a JWT token.
     *
     * @param token the JWT token
     * @return the list of roles
     */
    @Override
    @SuppressWarnings("unchecked")
    public List<String> extractRoles(String token) {
        Claims claims = extractClaims(token);
        return claims.get("roles", List.class);
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<String> extractPermissions(String token) {
        Claims claims = extractClaims(token);
        List<String> perms = claims.get("permissions", List.class);
        return Objects.nonNull(perms) ? perms : List.of();
    }

    /**
     * Validates a JWT token.
     *
     * @param token the JWT token
     * @return true if valid
     */
    @Override
    public boolean validateToken(String token) {
        try {
            extractClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException exception) {
            return false;
        }
    }

    /**
     * Checks if a token is expired.
     *
     * @param token the JWT token
     * @return true if expired
     */
    @Override
    public boolean isTokenExpired(String token) {
        try {
            Claims claims = extractClaims(token);
            Date expiration = claims.getExpiration();
            return Objects.nonNull(expiration) && expiration.before(new Date());
        } catch (JwtException | IllegalArgumentException exception) {
            return true;
        }
    }

    private Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
