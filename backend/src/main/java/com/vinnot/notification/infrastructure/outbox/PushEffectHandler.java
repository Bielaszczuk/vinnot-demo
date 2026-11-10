package com.vinnot.notification.infrastructure.outbox;

import com.vinnot.notification.application.port.in.DeliverPushUseCase;
import com.vinnot.shared.infrastructure.effects.ExternalEffectHandler;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Push jobs run outside the outbox transaction: the provider call may wait on the rate limit and on retries, and the
 * delivery records its own sends durably batch by batch, so no connection or row lock is held meanwhile.
 */
@Component
public class PushEffectHandler implements ExternalEffectHandler {
    private final DeliverPushUseCase delivery;

    public PushEffectHandler(DeliverPushUseCase delivery) {
        this.delivery = delivery;
    }

    @Override
    public boolean supports(String kind) {
        return OutboxPushAdapter.KIND.equals(kind);
    }

    @Override
    public void execute(String kind, Map<String, Object> payload) {
        delivery.deliver(OutboxPushAdapter.decode(payload));
    }

    @Override
    public boolean transactional() {
        return false;
    }
}
