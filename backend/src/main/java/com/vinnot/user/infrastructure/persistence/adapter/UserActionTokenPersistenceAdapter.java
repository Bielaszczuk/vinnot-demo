package com.vinnot.user.infrastructure.persistence.adapter;

import com.vinnot.user.application.port.out.UserActionTokenRepositoryPort;
import com.vinnot.user.domain.model.UserActionToken;
import com.vinnot.user.domain.valueobject.UserActionTokenType;
import com.vinnot.user.infrastructure.persistence.entity.UserActionTokenJpaEntity;
import com.vinnot.user.infrastructure.persistence.jpa.UserActionTokenJpaRepository;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class UserActionTokenPersistenceAdapter implements UserActionTokenRepositoryPort {

    private final UserActionTokenJpaRepository repository;

    @Override
    public UserActionToken save(UserActionToken token) {
        UserActionTokenJpaEntity entity = new UserActionTokenJpaEntity();
        entity.setId(token.id());
        entity.setUserId(token.userId());
        entity.setType(token.type());
        entity.setTokenHash(token.tokenHash());
        entity.setExpiresAt(token.expiresAt());
        entity.setUsedAt(token.usedAt());
        entity.setCreatedAt(token.createdAt());
        entity.setTargetValue(token.targetValue());
        return toDomain(repository.save(entity));
    }

    @Override
    public Optional<UserActionToken> findUsableByHashAndType(
            String tokenHash, UserActionTokenType type, Instant now) {
        return repository
                .findFirstByTokenHashAndTypeAndUsedAtIsNullAndExpiresAtAfter(tokenHash, type, now)
                .map(this::toDomain);
    }

    @Override
    public Optional<UserActionToken> findByHashAndType(
            String tokenHash, UserActionTokenType type) {
        return repository.findFirstByTokenHashAndType(tokenHash, type)
                .map(this::toDomain);
    }

    @Override
    public void invalidateActiveTokens(
            UUID userId, UserActionTokenType type, Instant usedAt) {
        repository.invalidateActiveTokens(userId, type, usedAt);
    }

    private UserActionToken toDomain(UserActionTokenJpaEntity entity) {
        return new UserActionToken(
                entity.getId(), entity.getUserId(), entity.getType(), entity.getTokenHash(),
                entity.getExpiresAt(), entity.getUsedAt(), entity.getCreatedAt(),
                entity.getTargetValue());
    }
}
