package com.vinnot.community.infrastructure.gamification;

import com.vinnot.community.application.port.out.FollowerPointsPort;
import com.vinnot.gamification.application.command.model.AwardPointsCommand;
import com.vinnot.gamification.application.command.model.RevokePointsCommand;
import com.vinnot.gamification.application.port.in.AwardPointsUseCase;
import com.vinnot.gamification.domain.model.PointSource;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Component;

import java.util.UUID;

/** The follower point is keyed by the follower, so one member earns at most one point per follower at a time. */
@Component
@RequiredArgsConstructor
public class GamificationFollowerPointsAdapter implements FollowerPointsPort {
    private final AwardPointsUseCase points;

    @Override
    public void followerGained(UUID followee, UUID follower) {
        points.award(new AwardPointsCommand(followee, PointSource.FOLLOWER_GAINED, follower.toString(), null));
    }

    @Override
    public void followerLost(UUID followee, UUID follower) {
        points.revoke(RevokePointsCommand.of(followee, PointSource.FOLLOWER_GAINED, follower.toString()));
    }
}
