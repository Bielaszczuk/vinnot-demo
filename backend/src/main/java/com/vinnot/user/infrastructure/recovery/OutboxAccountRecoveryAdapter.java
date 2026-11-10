package com.vinnot.user.infrastructure.recovery;

import com.vinnot.shared.infrastructure.effects.DurableEffectQueue;
import com.vinnot.user.application.port.out.AccountRecoveryRequestPort;
import com.vinnot.user.domain.valueobject.AccountRecoveryAction;
import com.vinnot.user.domain.valueobject.Email;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

/**
 * One {@code external_effects} row per request. The key is random, so it says nothing about the account
 * and every request is kept, as before (each one issues a new link).
 */
@Component
public class OutboxAccountRecoveryAdapter implements AccountRecoveryRequestPort {
    public static final String KIND = "ACCOUNT_RECOVERY_REQUESTED";
    static final String KEY_PREFIX = "account-recovery:";
    static final String ACTION = "action";
    static final String EMAIL = "email";
    private final DurableEffectQueue queue;

    public OutboxAccountRecoveryAdapter(DurableEffectQueue queue) {
        this.queue = queue;
    }

    @Override
    public void request(AccountRecoveryAction action, Email email) {
        queue.enqueue(KIND, KEY_PREFIX + UUID.randomUUID(), Map.of(ACTION, action.name(), EMAIL, email.getValue()),
                Duration.ZERO);
    }
}
