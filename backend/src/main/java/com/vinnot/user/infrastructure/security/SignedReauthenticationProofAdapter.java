package com.vinnot.user.infrastructure.security;

import com.vinnot.user.application.port.out.ReauthenticationProofPort;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.HexFormat;
import java.util.Objects;
import java.util.UUID;
import javax.crypto.SecretKey;

/** Purpose-separated signing key: these short-lived proofs cannot authenticate as access JWTs. */
@Component
public class SignedReauthenticationProofAdapter implements ReauthenticationProofPort {
    private static final Duration LIFETIME = Duration.ofMinutes(5);
    private final SecretKey key;
    private final Clock clock;

    @Autowired
    public SignedReauthenticationProofAdapter(@Value("${jwt.secret}") String secret) {
        this(secret, Clock.systemUTC());
    }

    SignedReauthenticationProofAdapter(String secret, Clock clock) {
        this.key = Keys.hmacShaKeyFor(digest("vinnot-admin-reauthentication-v1:" + secret));
        this.clock = clock;
    }

    @Override
    public String issue(UUID userId, String sessionBinding) {
        Instant now = clock.instant();
        return Jwts.builder().subject(userId.toString()).claim("session", sessionBinding)
                .issuedAt(Date.from(now)).expiration(Date.from(now.plus(LIFETIME)))
                .signWith(key).compact();
    }

    @Override
    public boolean permits(String proof, UUID userId, String sessionBinding) {
        if (Objects.isNull(proof) || proof.isBlank()) {
            return false;
        }
        try {
            var claims = Jwts.parser().verifyWith(key).clock(() -> Date.from(clock.instant()))
                    .build().parseSignedClaims(proof).getPayload();
            return userId.toString().equals(claims.getSubject()) && sessionBinding.equals(claims.get("session", String.class));
        } catch (JwtException | IllegalArgumentException exception) {
            return false;
        }
    }

    public static String sessionBinding(String authorization) {
        return HexFormat.of().formatHex(digest(authorization));
    }

    private static byte[] digest(String value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 unavailable", exception);
        }
    }
}
