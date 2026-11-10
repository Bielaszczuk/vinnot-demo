package com.vinnot.gamification.application.port.out;

import com.vinnot.gamification.domain.model.DailyEarnings;
import com.vinnot.gamification.domain.model.PointAward;
import com.vinnot.gamification.domain.model.PointMovement;
import com.vinnot.gamification.domain.model.PointSource;
import com.vinnot.gamification.domain.model.PointsAccount;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Where points live: one totals row per member, the awards (unique per member, source and key) and the movements. */
public interface PointsLedgerPort {

    /**
     * Locks the member's points row for the rest of the transaction, creating it when missing, so concurrent awards
     * for one member run one after the other.
     *
     * @param userId the member
     * @return the locked account, or empty when the member no longer exists
     */
    Optional<PointsAccount> lockAccount(UUID userId);

    /** The member's account without locking it; a member who never earned points gets a fresh one. */
    Optional<PointsAccount> findAccount(UUID userId);

    void saveAccount(PointsAccount account);

    Optional<PointAward> findAward(UUID userId, PointSource source, String sourceKey);

    /** The active awards of a source whose key starts with {@code keyPrefix}. */
    List<PointAward> findActiveAwards(UUID userId, PointSource source, String keyPrefix);

    /** Inserts the award or replaces the stored one with the same member, source and key. */
    void saveAward(PointAward award, Instant at);

    void recordMovement(PointMovement movement);

    /** Points awarded since {@code since}: from {@code source}, and from every source within the daily cap. */
    DailyEarnings earnedSince(UUID userId, PointSource source, Instant since);

    /** The latest movements, newest first, labelled with the current wine or event name. */
    List<PointMovement> recentMovements(UUID userId, int limit);

    /** Points of existing members; {@code visible} is false while a member is locked or inactive. */
    List<MemberPoints> pointsOf(Collection<UUID> userIds);

    record MemberPoints(UUID userId, int points, boolean visible) {
    }
}
