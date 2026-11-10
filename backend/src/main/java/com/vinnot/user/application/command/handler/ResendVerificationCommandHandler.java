package com.vinnot.user.application.command.handler;

import com.vinnot.user.application.command.model.ResendVerificationCommand;
import com.vinnot.user.application.port.in.ResendVerificationUseCase;
import com.vinnot.user.application.port.out.AccountRecoveryRequestPort;
import com.vinnot.user.domain.valueobject.AccountRecoveryAction;
import com.vinnot.user.domain.valueobject.Email;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

/**
 * Only queues the request: looking the account up here would make the response time and provider
 * errors depend on whether the address belongs to an account.
 */
@Service
@RequiredArgsConstructor
public class ResendVerificationCommandHandler implements ResendVerificationUseCase {

    private final AccountRecoveryRequestPort recoveryRequests;

    @Override
    @Transactional
    public void execute(ResendVerificationCommand command) {
        recoveryRequests.request(AccountRecoveryAction.EMAIL_VERIFICATION, Email.of(command.email()));
    }
}
