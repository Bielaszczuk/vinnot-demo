package com.vinnot.gamification.application;

import com.vinnot.gamification.application.port.out.PointsLedgerPort;
import com.vinnot.gamification.domain.model.DailyEarnings;
import com.vinnot.gamification.domain.model.PointAward;
import com.vinnot.gamification.domain.model.PointMovement;
import com.vinnot.gamification.domain.model.PointSource;
import com.vinnot.gamification.domain.model.PointsAccount;

import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/** A ledger kept in memory with the same contract as the JDBC one, for handler tests. */
public final class InMemoryPointsLedger implements PointsLedgerPort {
    public final Map<UUID, ZoneId> members = new HashMap<>();
    public final Set<UUID> hidden = new HashSet<>();
    public final Map<UUID, PointsAccount> accounts = new HashMap<>();
    public final Map<String, PointAward> awards = new HashMap<>();
    public final List<PointMovement> movements = new ArrayList<>();
    public final Map<UUID, String> labels = new HashMap<>();

    public UUID member(ZoneId zone) {
        UUID id = UUID.randomUUID();
        members.put(id, zone);
        return id;
    }

    public int points(UUID userId) {
        return accounts.containsKey(userId) ? accounts.get(userId).points() : 0;
    }

    @Override
    public Optional<PointsAccount> lockAccount(UUID userId) {
        if (!members.containsKey(userId)) {
            return Optional.empty();
        }
        accounts.computeIfAbsent(userId, id -> PointsAccount.fresh(id, members.get(id)));
        return findAccount(userId);
    }

    @Override
    public Optional<PointsAccount> findAccount(UUID userId) {
        if (!members.containsKey(userId)) {
            return Optional.empty();
        }
        PointsAccount stored = accounts.getOrDefault(userId, PointsAccount.fresh(userId, members.get(userId)));
        return Optional.of(new PointsAccount(userId, stored.zone(), stored.points(), stored.highestReached(),
                stored.highestCelebrated(), stored.welcomeSeen()));
    }

    @Override
    public void saveAccount(PointsAccount account) {
        accounts.put(account.userId(), account);
    }

    @Override
    public Optional<PointAward> findAward(UUID userId, PointSource source, String sourceKey) {
        return Optional.ofNullable(awards.get(key(userId, source, sourceKey)));
    }

    @Override
    public List<PointAward> findActiveAwards(UUID userId, PointSource source, String keyPrefix) {
        return awards.values().stream().filter(award -> award.userId().equals(userId) && award.source() == source
                && award.active() && award.sourceKey().startsWith(keyPrefix)).toList();
    }

    @Override
    public void saveAward(PointAward award, Instant at) {
        awards.put(key(award.userId(), award.source(), award.sourceKey()), award);
    }

    @Override
    public void recordMovement(PointMovement movement) {
        movements.add(movement);
    }

    @Override
    public DailyEarnings earnedSince(UUID userId, PointSource source, Instant since) {
        int fromSource = 0;
        int withinCap = 0;
        for (PointMovement movement : movements) {
            if (movement.userId().equals(userId) && movement.points() > 0 && !movement.createdAt().isBefore(since)) {
                fromSource += movement.source() == source ? movement.points() : 0;
                withinCap += movement.source().countsTowardDailyCap() ? movement.points() : 0;
            }
        }
        return new DailyEarnings(fromSource, withinCap);
    }

    @Override
    public List<PointMovement> recentMovements(UUID userId, int limit) {
        return movements.stream().filter(movement -> movement.userId().equals(userId))
                .sorted(Comparator.comparing(PointMovement::createdAt).reversed()).limit(limit)
                .map(movement -> new PointMovement(movement.id(), movement.userId(), movement.source(),
                        movement.sourceKey(), movement.points(), movement.subject(), movement.createdAt(),
                        movement.subject() == null ? null : labels.get(movement.subject().id())))
                .toList();
    }

    @Override
    public List<MemberPoints> pointsOf(Collection<UUID> userIds) {
        return userIds.stream().filter(members::containsKey)
                .map(id -> new MemberPoints(id, points(id), !hidden.contains(id))).toList();
    }

    private static String key(UUID userId, PointSource source, String sourceKey) {
        return userId + "|" + source + "|" + sourceKey;
    }
}
