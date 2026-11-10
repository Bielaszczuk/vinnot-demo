package com.vinnot.gamification.application.query.handler;

import com.vinnot.gamification.application.port.in.GetPointStandingsUseCase;
import com.vinnot.gamification.application.port.out.PointsLedgerPort;
import com.vinnot.gamification.application.query.response.PointStanding;
import com.vinnot.gamification.domain.model.Tier;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/** Points and seals for a whole page of members in one read; a locked or inactive member shows no seal. */
@Service
@RequiredArgsConstructor
public class GetPointStandingsQueryHandler implements GetPointStandingsUseCase {
    private final PointsLedgerPort ledger;

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, PointStanding> standings(Collection<UUID> userIds) {
        Map<UUID, PointStanding> standings = new HashMap<>();
        if (userIds.isEmpty()) {
            return standings;
        }
        for (PointsLedgerPort.MemberPoints member : ledger.pointsOf(userIds)) {
            standings.put(member.userId(), new PointStanding(member.points(),
                    member.visible() ? Tier.forPoints(member.points()).name() : null));
        }
        return standings;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, String> badgeTiers(Collection<UUID> userIds) {
        Map<UUID, String> tiers = new HashMap<>();
        standings(userIds).forEach((userId, standing) -> {
            if (Objects.nonNull(standing.badgeTier())) {
                tiers.put(userId, standing.badgeTier());
            }
        });
        return tiers;
    }
}
