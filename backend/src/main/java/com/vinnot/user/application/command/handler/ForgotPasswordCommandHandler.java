package com.vinnot.user.application.command.handler;

import com.vinnot.user.application.command.model.ForgotPasswordCommand;
import com.vinnot.user.application.port.in.ForgotPasswordUseCase;
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
public class ForgotPasswordCommandHandler implements ForgotPasswordUseCase {

    private final AccountRecoveryRequestPort recoveryRequests;

    @Override
    @Transactional
    public void execute(ForgotPasswordCommand command) {
        recoveryRequests.request(AccountRecoveryAction.PASSWORD_RESET, Email.of(command.email()));
    }
}
