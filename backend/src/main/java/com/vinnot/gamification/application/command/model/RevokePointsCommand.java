package com.vinnot.gamification.application.command.model;

import com.vinnot.gamification.domain.model.PointSource;

import java.util.Objects;
import java.util.UUID;

/**
 * Take back the points of one source: the award with exactly this key, or every active award whose key starts with
 * it (the likes of a deleted review). Idempotent: nothing to revoke does nothing.
 *
 * @param userId    whose points are revoked
 * @param source    what they were for
 * @param sourceKey the key, or the key prefix when {@code prefix} is set
 * @param prefix    whether {@code sourceKey} is a prefix
 */
public record RevokePointsCommand(UUID userId, PointSource source, String sourceKey, boolean prefix) {
    public RevokePointsCommand {
        Objects.requireNonNull(userId, "userId");
        Objects.requireNonNull(source, "source");
        Objects.requireNonNull(sourceKey, "sourceKey");
    }

    public static RevokePointsCommand of(UUID userId, PointSource source, String sourceKey) {
        return new RevokePointsCommand(userId, source, sourceKey, false);
    }

    public static RevokePointsCommand everyKeyStartingWith(UUID userId, PointSource source, String keyPrefix) {
        return new RevokePointsCommand(userId, source, keyPrefix, true);
    }
}
