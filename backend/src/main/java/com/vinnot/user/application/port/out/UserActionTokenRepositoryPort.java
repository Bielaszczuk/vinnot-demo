package com.vinnot.user.application.port.out;

import com.vinnot.user.domain.model.UserActionToken;
import com.vinnot.user.domain.valueobject.UserActionTokenType;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface UserActionTokenRepositoryPort {
    UserActionToken save(UserActionToken token);

    Optional<UserActionToken> findUsableByHashAndType(
            String tokenHash, UserActionTokenType type, Instant now);

    Optional<UserActionToken> findByHashAndType(
            String tokenHash, UserActionTokenType type);

    void invalidateActiveTokens(UUID userId, UserActionTokenType type, Instant usedAt);
}
