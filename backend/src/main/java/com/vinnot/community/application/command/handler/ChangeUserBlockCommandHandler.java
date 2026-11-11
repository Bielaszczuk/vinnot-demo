package com.vinnot.community.application.command.handler;

import com.vinnot.community.application.command.model.ChangeUserBlockCommand;
import com.vinnot.community.application.port.in.ChangeUserBlockUseCase;
import com.vinnot.community.application.port.out.FollowRepositoryPort;
import com.vinnot.community.application.port.out.FollowRepositoryPort.FollowPair;
import com.vinnot.community.application.port.out.FollowerPointsPort;
import com.vinnot.community.application.port.out.UserBlockRepositoryPort;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Blocking is idempotent and also ends the follows in both directions (#541), taking back their follower points in
 * the same transaction. Unblocking restores nothing: either member may follow again.
 */
@Service
@RequiredArgsConstructor
public class ChangeUserBlockCommandHandler implements ChangeUserBlockUseCase {
    private final UserBlockRepositoryPort blocks;
    private final FollowRepositoryPort follows;
    private final FollowerPointsPort points;

    @Override
    @Transactional
    public void execute(ChangeUserBlockCommand command) {
        if (command.userId().equals(command.targetUserId())) {
            throw new BusinessRuleViolationException("SELF_BLOCK", "You cannot block yourself");
        }
        if (!command.blocked()) {
            blocks.unblock(command.userId(), command.targetUserId());
            return;
        }
        if (!blocks.userExists(command.targetUserId())) {
            throw new EntityNotFoundException("User", command.targetUserId());
        }
        follows.lockPair(command.userId(), command.targetUserId());
        blocks.block(command.userId(), command.targetUserId());
        for (FollowPair removed : follows.removeBetween(command.userId(), command.targetUserId())) {
            points.followerLost(removed.followeeId(), removed.followerId());
        }
    }
}
