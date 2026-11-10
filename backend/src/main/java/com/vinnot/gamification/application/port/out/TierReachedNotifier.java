package com.vinnot.gamification.application.port.out;

import com.vinnot.gamification.domain.model.Tier;

import java.util.UUID;

/** Tells a member they reached a tier for the first time; queued in the caller's transaction, sent once per tier. */
public interface TierReachedNotifier {
    void tierReached(UUID userId, Tier tier);
}
