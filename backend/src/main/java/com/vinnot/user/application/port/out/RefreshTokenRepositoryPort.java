package com.vinnot.user.application.port.out;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepositoryPort {

    Optional<RefreshTokenData> findByTokenHash(String tokenHash);

    default void save(UUID userId, String tokenHash, Instant expiresAt) {
        save(userId, tokenHash, expiresAt, 0);
    }

    void save(UUID userId, String tokenHash, Instant expiresAt, long sessionVersion);

    void revoke(String tokenHash, String reason, String replacedByTokenHash);

    /** Revokes {@code tokenHash} and every token that later replaced it, following the rotation chain. */
    void revokeRotationChain(String tokenHash, String reason);

    void deleteByUserId(UUID userId);

    record RefreshTokenData(
            UUID userId,
            String tokenHash,
            Instant expiresAt,
            Instant revokedAt,
            String revokedReason,
            boolean valid,
            long sessionVersion,
            String replacedByTokenHash
    ) {
        public RefreshTokenData(UUID userId, String tokenHash, Instant expiresAt,
                                Instant revokedAt, String revokedReason, boolean valid) {
            this(userId, tokenHash, expiresAt, revokedAt, revokedReason, valid, 0);
        }
        public RefreshTokenData(UUID userId, String tokenHash, Instant expiresAt,
                                Instant revokedAt, String revokedReason, boolean valid, long sessionVersion) {
            this(userId, tokenHash, expiresAt, revokedAt, revokedReason, valid, sessionVersion, null);
        }
    }
}
