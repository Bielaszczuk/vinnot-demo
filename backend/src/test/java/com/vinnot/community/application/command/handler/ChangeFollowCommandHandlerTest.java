package com.vinnot.community.application.command.handler;

import com.vinnot.community.application.command.model.ChangeFollowCommand;
import com.vinnot.community.application.command.model.ChangeUserBlockCommand;
import com.vinnot.community.application.port.out.CommunityProfileAccessPort;
import com.vinnot.community.application.port.out.FollowRepositoryPort;
import com.vinnot.community.application.port.out.FollowRepositoryPort.FollowPair;
import com.vinnot.community.application.port.out.FollowRepositoryPort.Member;
import com.vinnot.community.application.port.out.FollowerPointsPort;
import com.vinnot.community.application.port.out.NewFollowerNotifier;
import com.vinnot.community.application.port.out.UserBlockRepositoryPort;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** #541 S7: follow and unfollow rules, follower points and the new-follower push; a block removes follows both ways. */
class ChangeFollowCommandHandlerTest {
    private final UUID follower = UUID.randomUUID();
    private final UUID followee = UUID.randomUUID();
    private final FollowRepositoryPort follows = mock(FollowRepositoryPort.class);
    private final CommunityProfileAccessPort access = mock(CommunityProfileAccessPort.class);
    private final FollowerPointsPort points = mock(FollowerPointsPort.class);
    private final NewFollowerNotifier notifier = mock(NewFollowerNotifier.class);
    private final ChangeFollowCommandHandler handler = new ChangeFollowCommandHandler(follows, access, points, notifier);

    @Test
    void followingYourselfIsABadRequestAndTouchesNothing() {
        assertThatThrownBy(() -> handler.execute(new ChangeFollowCommand(follower, follower, true)))
                .isInstanceOf(DomainException.class).extracting("code").isEqualTo("SELF_FOLLOW");
        verifyNoInteractions(follows, points, notifier);
    }

    @Test
    void aMissingInactiveOrBlockedTargetIsNotFoundAndNotFollowed() {
        assertThatThrownBy(() -> handler.execute(new ChangeFollowCommand(follower, followee, true)))
                .isInstanceOf(EntityNotFoundException.class);
        when(follows.findActiveMember(followee)).thenReturn(Optional.of(member(followee, "Bea", "")));
        when(access.blockedBetween(follower, followee)).thenReturn(true);
        assertThatThrownBy(() -> handler.execute(new ChangeFollowCommand(follower, followee, true)))
                .isInstanceOf(EntityNotFoundException.class);
        verify(follows, never()).follow(any(), any());
        verifyNoInteractions(points, notifier);
    }

    @Test
    void aNewFollowFromAQualifiedMemberAwardsThePointAndPushesUnderThePairLock() {
        when(follows.findActiveMember(followee)).thenReturn(Optional.of(member(followee, "Bea", "")));
        when(follows.findActiveMember(follower)).thenReturn(Optional.of(member(follower, "Ana", "Lopez")));
        when(follows.follow(follower, followee)).thenReturn(true);
        when(follows.qualifiesForFollowerPoints(follower)).thenReturn(true);
        handler.execute(new ChangeFollowCommand(follower, followee, true));
        var order = inOrder(follows, points, notifier);
        order.verify(follows).lockPair(follower, followee);
        order.verify(follows).follow(follower, followee);
        order.verify(points).followerGained(followee, follower);
        order.verify(notifier).newFollower(followee, follower, "Ana Lopez");
    }

    @Test
    void anUnqualifiedFollowerStillFollowsAndNotifiesButEarnsNothing() {
        when(follows.findActiveMember(followee)).thenReturn(Optional.of(member(followee, "Bea", "")));
        when(follows.findActiveMember(follower)).thenReturn(Optional.of(member(follower, "", "")));
        when(follows.follow(follower, followee)).thenReturn(true);
        handler.execute(new ChangeFollowCommand(follower, followee, true));
        verify(points, never()).followerGained(any(), any());
        verify(notifier).newFollower(followee, follower, "user-" + follower);
    }

    @Test
    void followingAgainIsIdempotent() {
        when(follows.findActiveMember(followee)).thenReturn(Optional.of(member(followee, "Bea", "")));
        when(follows.follow(follower, followee)).thenReturn(false);
        handler.execute(new ChangeFollowCommand(follower, followee, true));
        verifyNoInteractions(points, notifier);
    }

    @Test
    void unfollowingRevokesThePointOnlyWhenAFollowWasRemoved() {
        when(follows.unfollow(follower, followee)).thenReturn(true);
        handler.execute(new ChangeFollowCommand(follower, followee, false));
        verify(points).followerLost(followee, follower);
        when(follows.unfollow(follower, followee)).thenReturn(false);
        handler.execute(new ChangeFollowCommand(follower, followee, false));
        verify(points).followerLost(followee, follower);
        verify(notifier, never()).newFollower(any(), any(), anyString());
    }

    @Test
    void blockingRemovesFollowsBothWaysAndRevokesTheirPoints() {
        var blocks = mock(UserBlockRepositoryPort.class);
        var blockHandler = new ChangeUserBlockCommandHandler(blocks, follows, points);
        when(blocks.userExists(followee)).thenReturn(true);
        when(follows.removeBetween(follower, followee)).thenReturn(List.of(
                new FollowPair(follower, followee), new FollowPair(followee, follower)));
        blockHandler.execute(new ChangeUserBlockCommand(follower, followee, true));
        var order = inOrder(follows, blocks, points);
        order.verify(follows).lockPair(follower, followee);
        order.verify(blocks).block(follower, followee);
        order.verify(follows).removeBetween(follower, followee);
        verify(points).followerLost(followee, follower);
        verify(points).followerLost(follower, followee);
    }

    @Test
    void unblockingLeavesFollowsAlone() {
        var blocks = mock(UserBlockRepositoryPort.class);
        new ChangeUserBlockCommandHandler(blocks, follows, points)
                .execute(new ChangeUserBlockCommand(follower, followee, false));
        verify(blocks).unblock(follower, followee);
        verifyNoInteractions(follows, points);
    }

    private static Member member(UUID id, String first, String last) {
        return new Member(id, "user-" + id, first, last);
    }
}
