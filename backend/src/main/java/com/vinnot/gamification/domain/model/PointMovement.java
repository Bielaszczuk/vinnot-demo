package com.vinnot.gamification.domain.model;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * One line of a member's points history: an award (positive) or a revocation (negative).
 *
 * @param id        the movement
 * @param userId    whose points moved
 * @param source    what it was for
 * @param sourceKey the content it was for
 * @param points    positive for an award, negative for a revocation
 * @param subject   the wine or event it is about, may be {@code null}
 * @param createdAt when it happened
 * @param label     the current wine or event name when read back, otherwise {@code null}
 */
public record PointMovement(UUID id, UUID userId, PointSource source, String sourceKey, int points,
        PointSubject subject, Instant createdAt, String label) {
    public PointMovement {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(userId, "userId");
        Objects.requireNonNull(source, "source");
        Objects.requireNonNull(createdAt, "createdAt");
    }

    /** The movement that grants an award. */
    public static PointMovement awarded(PointAward award, Instant at) {
        return new PointMovement(UUID.randomUUID(), award.userId(), award.source(), award.sourceKey(), award.points(),
                award.subject(), at, null);
    }

    /** The movement that takes an award back. */
    public static PointMovement revoked(PointAward award, Instant at) {
        return new PointMovement(UUID.randomUUID(), award.userId(), award.source(), award.sourceKey(), -award.points(),
                award.subject(), at, null);
    }
}
