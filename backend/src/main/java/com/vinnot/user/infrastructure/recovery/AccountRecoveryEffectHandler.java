package com.vinnot.user.infrastructure.recovery;

import com.vinnot.shared.infrastructure.effects.ExternalEffectHandler;
import com.vinnot.user.application.port.in.IssueAccountRecoveryUseCase;
import com.vinnot.user.domain.valueobject.AccountRecoveryAction;
import com.vinnot.user.domain.valueobject.Email;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Issues the link of a queued recovery request inside the worker's job transaction. The token and its
 * email commit together with the job; a failure rolls both back and the worker records the attempt on its
 * own, so a retry never finds half of them.
 */
@Component
public class AccountRecoveryEffectHandler implements ExternalEffectHandler {
    private final IssueAccountRecoveryUseCase recovery;

    public AccountRecoveryEffectHandler(IssueAccountRecoveryUseCase recovery) {
        this.recovery = recovery;
    }

    @Override
    public boolean supports(String kind) {
        return OutboxAccountRecoveryAdapter.KIND.equals(kind);
    }

    @Override
    public void execute(String kind, Map<String, Object> payload) {
        AccountRecoveryAction action = AccountRecoveryAction.valueOf(
                String.valueOf(payload.get(OutboxAccountRecoveryAdapter.ACTION)));
        Email email = Email.of(String.valueOf(payload.get(OutboxAccountRecoveryAdapter.EMAIL)));
        recovery.issue(action, email);
    }
}
