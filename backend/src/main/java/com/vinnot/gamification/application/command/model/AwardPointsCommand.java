package com.vinnot.gamification.application.command.model;

import com.vinnot.gamification.domain.model.PointSource;
import com.vinnot.gamification.domain.model.PointSubject;

import java.util.Objects;
import java.util.UUID;

/**
 * Award a member the points of one source for one piece of content. Idempotent per member, source and key.
 *
 * @param userId    who earns the points
 * @param source    what they are for
 * @param sourceKey the content they are for
 * @param subject   the wine or event it is about, may be {@code null}
 */
public record AwardPointsCommand(UUID userId, PointSource source, String sourceKey, PointSubject subject) {
    public AwardPointsCommand {
        Objects.requireNonNull(userId, "userId");
        Objects.requireNonNull(source, "source");
        Objects.requireNonNull(sourceKey, "sourceKey");
    }
}
