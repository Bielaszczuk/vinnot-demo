package com.vinnot.community.infrastructure.gamification;

import com.vinnot.community.application.port.out.MemberBadgePort;
import com.vinnot.gamification.application.port.in.GetPointStandingsUseCase;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class GamificationMemberBadgeAdapter implements MemberBadgePort {
    private final GetPointStandingsUseCase standings;

    @Override
    public Map<UUID, String> badgeTiers(Collection<UUID> userIds) {
        return standings.badgeTiers(userIds);
    }
}
