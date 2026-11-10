package com.vinnot.user.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "refresh_tokens")
public class RefreshTokenJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "session_version", nullable = false)
    private long sessionVersion;

    @Column(name = "token_hash", nullable = false)
    private String tokenHash;

    @Column(name = "device_info")
    private String deviceInfo;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "revoked_reason")
    private String revokedReason;

    @Column(name = "replaced_by_token_hash")
    private String replacedByTokenHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    /**
     * Checks if the token is expired.
     *
     * @return true if expired
     */
    public boolean isExpired() {
        return expiresAt.isBefore(Instant.now());
    }

    /**
     * Checks if the token is revoked.
     *
     * @return true if revoked
     */
    public boolean isRevoked() {
        return Objects.nonNull(revokedAt);
    }

    /**
     * Checks if the token is valid.
     *
     * @return true if valid
     */
    public boolean isValid() {
        return !isExpired() && !isRevoked();
    }
}
