package com.vinnot.community.application.command.handler;

import com.vinnot.community.application.command.model.ChangeFollowCommand;
import com.vinnot.community.application.port.in.ChangeFollowUseCase;
import com.vinnot.community.application.port.out.CommunityProfileAccessPort;
import com.vinnot.community.application.port.out.FollowRepositoryPort;
import com.vinnot.community.application.port.out.FollowRepositoryPort.Member;
import com.vinnot.community.application.port.out.FollowerPointsPort;
import com.vinnot.community.application.port.out.NewFollowerNotifier;
import com.vinnot.community.domain.model.PublicName;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Follows need no approval (#541). Following is idempotent and refused for oneself, for missing or inactive members
 * and while either member blocks the other (answered as not found, like the profile). A new follow from a qualified
 * member earns the followed member a point; unfollowing takes it back. Points and the push join this transaction.
 */
@Service
@RequiredArgsConstructor
public class ChangeFollowCommandHandler implements ChangeFollowUseCase {
    private final FollowRepositoryPort follows;
    private final CommunityProfileAccessPort access;
    private final FollowerPointsPort points;
    private final NewFollowerNotifier notifier;

    @Override
    @Transactional
    public void execute(ChangeFollowCommand command) {
        if (command.followerId().equals(command.followeeId())) {
            throw new DomainException("SELF_FOLLOW", "You cannot follow yourself");
        }
        if (!command.following()) {
            if (follows.unfollow(command.followerId(), command.followeeId())) {
                points.followerLost(command.followeeId(), command.followerId());
            }
            return;
        }
        follows.lockPair(command.followerId(), command.followeeId());
        if (follows.findActiveMember(command.followeeId()).isEmpty()
                || access.blockedBetween(command.followerId(), command.followeeId())) {
            throw new EntityNotFoundException("User", command.followeeId());
        }
        if (!follows.follow(command.followerId(), command.followeeId())) {
            return;
        }
        if (follows.qualifiesForFollowerPoints(command.followerId())) {
            points.followerGained(command.followeeId(), command.followerId());
        }
        follows.findActiveMember(command.followerId()).ifPresent(follower ->
                notifier.newFollower(command.followeeId(), command.followerId(), name(follower)));
    }

    private static String name(Member member) {
        return PublicName.of(member.username(), member.firstName(), member.lastName());
    }
}
