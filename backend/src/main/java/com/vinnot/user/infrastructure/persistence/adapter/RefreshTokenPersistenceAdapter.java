package com.vinnot.user.infrastructure.persistence.adapter;

import com.vinnot.user.application.port.out.RefreshTokenRepositoryPort;
import com.vinnot.user.infrastructure.persistence.entity.RefreshTokenJpaEntity;
import com.vinnot.user.infrastructure.persistence.jpa.RefreshTokenJpaRepository;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class RefreshTokenPersistenceAdapter implements RefreshTokenRepositoryPort {

    private final RefreshTokenJpaRepository jpaRepository;

    @Override
    public Optional<RefreshTokenData> findByTokenHash(String tokenHash) {
        return jpaRepository.findByTokenHash(tokenHash)
                .map(entity -> new RefreshTokenData(
                        entity.getUserId(),
                        entity.getTokenHash(),
                        entity.getExpiresAt(),
                        entity.getRevokedAt(),
                        entity.getRevokedReason(),
                        entity.isValid(),
                        entity.getSessionVersion(),
                        entity.getReplacedByTokenHash()
                ));
    }

    @Override
    public void save(UUID userId, String tokenHash, Instant expiresAt, long sessionVersion) {
        RefreshTokenJpaEntity entity = new RefreshTokenJpaEntity();
        entity.setUserId(userId);
        entity.setSessionVersion(sessionVersion);
        entity.setTokenHash(tokenHash);
        entity.setExpiresAt(expiresAt);
        entity.setCreatedAt(Instant.now());
        jpaRepository.save(entity);
    }

    @Override
    public void revoke(String tokenHash, String reason, String replacedByTokenHash) {
        if ("logout".equals(reason)) {
            revokeRotationChain(tokenHash, reason);
            return;
        }
        jpaRepository.findByTokenHash(tokenHash).ifPresent(entity -> {
            entity.setRevokedAt(Instant.now());
            entity.setRevokedReason(reason);
            entity.setReplacedByTokenHash(replacedByTokenHash);
            jpaRepository.save(entity);
        });
    }

    @Override
    public void revokeRotationChain(String tokenHash, String reason) {
        Set<String> visited = new HashSet<>();
        String current = tokenHash;
        while (Objects.nonNull(current) && visited.add(current)) {
            var token = jpaRepository.findByTokenHash(current);
            if (token.isEmpty()) { return; }
            var entity = token.get();
            entity.setRevokedAt(Instant.now());
            entity.setRevokedReason(reason);
            current = entity.getReplacedByTokenHash();
            jpaRepository.save(entity);
        }
    }

    @Override
    public void deleteByUserId(UUID userId) {
        jpaRepository.deleteByUserId(userId);
    }
}
