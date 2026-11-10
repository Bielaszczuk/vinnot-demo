package com.vinnot.admin.infrastructure.gamification;

import com.vinnot.admin.application.port.out.UserPointsPort;
import com.vinnot.gamification.application.port.in.GetPointStandingsUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/** Admin standings from the points module. */
@Component("adminUserPointsAdapter")
@RequiredArgsConstructor
public class GamificationUserPointsAdapter implements UserPointsPort {
    private final GetPointStandingsUseCase standings;

    @Override
    public Map<UUID, Standing> standings(Collection<UUID> userIds) {
        Map<UUID, Standing> result = new HashMap<>();
        standings.standings(userIds).forEach((userId, standing) ->
                result.put(userId, new Standing(standing.points(), standing.badgeTier())));
        return result;
    }
}
