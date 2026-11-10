package com.vinnot.user.domain.model;

import com.vinnot.user.domain.valueobject.UserActionTokenType;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public record UserActionToken(
        UUID id,
        UUID userId,
        UserActionTokenType type,
        String tokenHash,
        Instant expiresAt,
        Instant usedAt,
        Instant createdAt,
        String targetValue
) {
    public UserActionToken {
        Objects.requireNonNull(id, "Token id cannot be null");
        Objects.requireNonNull(userId, "User id cannot be null");
        Objects.requireNonNull(type, "Token type cannot be null");
        Objects.requireNonNull(tokenHash, "Token hash cannot be null");
        Objects.requireNonNull(expiresAt, "Expiration cannot be null");
        Objects.requireNonNull(createdAt, "Created at cannot be null");
    }

    public static UserActionToken create(
            UUID userId, UserActionTokenType type, String tokenHash, Instant expiresAt) {
        return new UserActionToken(
                UUID.randomUUID(), userId, type, tokenHash, expiresAt, null, Instant.now(), null);
    }

    public static UserActionToken create(
            UUID userId,
            UserActionTokenType type,
            String tokenHash,
            Instant expiresAt,
            String targetValue) {
        return new UserActionToken(
                UUID.randomUUID(), userId, type, tokenHash, expiresAt, null,
                Instant.now(), targetValue);
    }

    public UserActionToken(
            UUID id,
            UUID userId,
            UserActionTokenType type,
            String tokenHash,
            Instant expiresAt,
            Instant usedAt,
            Instant createdAt) {
        this(id, userId, type, tokenHash, expiresAt, usedAt, createdAt, null);
    }

    public boolean isUsableAt(Instant instant) {
        return Objects.isNull(usedAt) && expiresAt.isAfter(instant);
    }

    public UserActionToken markUsed(Instant instant) {
        return new UserActionToken(
                id, userId, type, tokenHash, expiresAt, instant, createdAt, targetValue);
    }
}
