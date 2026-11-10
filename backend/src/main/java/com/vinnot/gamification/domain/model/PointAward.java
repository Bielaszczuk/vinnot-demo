package com.vinnot.gamification.domain.model;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * One award, unique per member, source and source key: awarding it again while active does nothing, and a revoked
 * award can be awarded again (an edited review approved once more).
 *
 * @param userId    who earned it
 * @param source    what it was for
 * @param sourceKey the content it was for (a wine, a like, a comment...)
 * @param subject   the wine or event it is about, used to label it; may be {@code null}
 * @param points    the points granted, after the daily caps
 * @param active    whether it still counts
 * @param awardedAt when it was last granted
 */
public record PointAward(UUID userId, PointSource source, String sourceKey, PointSubject subject, int points,
        boolean active, Instant awardedAt) {
    public PointAward {
        Objects.requireNonNull(userId, "userId");
        Objects.requireNonNull(source, "source");
        Objects.requireNonNull(sourceKey, "sourceKey");
        if (sourceKey.isBlank()) {
            throw new IllegalArgumentException("A point award needs a source key");
        }
    }

    public PointAward revoked() {
        return new PointAward(userId, source, sourceKey, subject, points, false, awardedAt);
    }
}
