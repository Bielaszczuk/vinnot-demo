package com.vinnot.community.application.port.out;

import com.vinnot.community.domain.model.TasteAdjustment;
import com.vinnot.community.domain.model.TasteTrait;

import java.util.Map;
import java.util.UUID;

/** Each member's manual palate values (#541 S11): at most one score per member and structure trait. */
public interface TasteAdjustmentRepositoryPort {
    /** The member's manual score per trait; empty when they adjusted nothing. */
    Map<TasteTrait, Integer> find(UUID userId);

    /** Upserts the scores the adjustment sets and deletes the traits it clears; other traits stay as they are. */
    void save(UUID userId, TasteAdjustment adjustment);

    /** Deletes every manual score of the member. */
    void clear(UUID userId);
}
