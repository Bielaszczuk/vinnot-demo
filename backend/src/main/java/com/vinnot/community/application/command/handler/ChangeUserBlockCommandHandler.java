package com.vinnot.community.application.command.handler;

import com.vinnot.community.application.command.model.ChangeUserBlockCommand;
import com.vinnot.community.application.port.in.ChangeUserBlockUseCase;
import com.vinnot.community.application.port.out.UserBlockRepositoryPort;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ChangeUserBlockCommandHandler implements ChangeUserBlockUseCase {
    private final UserBlockRepositoryPort blocks;

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
        blocks.block(command.userId(), command.targetUserId());
    }
}
