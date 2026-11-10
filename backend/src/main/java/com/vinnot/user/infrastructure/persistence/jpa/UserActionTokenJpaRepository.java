package com.vinnot.user.infrastructure.persistence.jpa;

import com.vinnot.user.domain.valueobject.UserActionTokenType;
import com.vinnot.user.infrastructure.persistence.entity.UserActionTokenJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface UserActionTokenJpaRepository
        extends JpaRepository<UserActionTokenJpaEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<UserActionTokenJpaEntity> findFirstByTokenHashAndTypeAndUsedAtIsNullAndExpiresAtAfter(
            String tokenHash, UserActionTokenType type, Instant now);

    Optional<UserActionTokenJpaEntity> findFirstByTokenHashAndType(
            String tokenHash, UserActionTokenType type);

    @Modifying
    @Query("UPDATE UserActionTokenJpaEntity token SET token.usedAt = :usedAt "
            + "WHERE token.userId = :userId AND token.type = :type AND token.usedAt IS NULL")
    void invalidateActiveTokens(
            @Param("userId") UUID userId,
            @Param("type") UserActionTokenType type,
            @Param("usedAt") Instant usedAt);
}
