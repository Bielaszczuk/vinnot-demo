package com.vinnot.user.application.service;

import com.vinnot.user.application.port.in.IssueAccountRecoveryUseCase;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.valueobject.AccountRecoveryAction;
import com.vinnot.user.domain.valueobject.Email;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Runs inside the durable worker's transaction, so the token and its email commit together with the
 * removal of the recovery job and a retry never issues a second link after a successful run.
 */
@Service
@RequiredArgsConstructor
public class IssueAccountRecoveryService implements IssueAccountRecoveryUseCase {
    private final UserRepositoryPort userRepository;
    private final AccountActionTokenService tokenService;

    @Override
    public void issue(AccountRecoveryAction action, Email email) {
        userRepository.findByEmail(email).filter(action::appliesTo).ifPresent(user -> {
            if (action == AccountRecoveryAction.PASSWORD_RESET) {
                tokenService.sendPasswordReset(user);
            } else {
                tokenService.sendEmailVerification(user);
            }
        });
    }
}
