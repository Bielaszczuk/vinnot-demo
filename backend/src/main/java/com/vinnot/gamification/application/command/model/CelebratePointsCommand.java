package com.vinnot.gamification.application.command.model;

import com.vinnot.gamification.domain.model.Tier;

import java.util.Objects;
import java.util.UUID;

/**
 * The member saw a celebration or the welcome card.
 *
 * @param userId  the member
 * @param tier    the tier celebrated (it and every lower one), or {@code null}
 * @param welcome whether the welcome card was dismissed
 */
public record CelebratePointsCommand(UUID userId, Tier tier, boolean welcome) {
    public CelebratePointsCommand {
        Objects.requireNonNull(userId, "userId");
    }
}
