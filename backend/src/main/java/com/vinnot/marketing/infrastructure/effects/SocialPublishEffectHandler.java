package com.vinnot.marketing.infrastructure.effects;

import com.vinnot.marketing.application.port.in.PublishSocialPostUseCase;
import com.vinnot.shared.infrastructure.effects.ExternalEffectHandler;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Runs a queued publication (#510) outside any transaction: the networks are slow and the use case makes its own writes
 * durable. A transient failure propagates so the worker backs off and runs it again; the use case caps its own attempts
 * before the worker's limit and returns normally once the publication is done, so the job is deleted.
 */
@Component
public class SocialPublishEffectHandler implements ExternalEffectHandler {
    private final PublishSocialPostUseCase publish;

    public SocialPublishEffectHandler(PublishSocialPostUseCase publish) {
        this.publish = publish;
    }

    @Override
    public boolean supports(String kind) {
        return OutboxSocialPublishQueue.KIND.equals(kind);
    }

    @Override
    public void execute(String kind, Map<String, Object> payload) {
        publish.publish(UUID.fromString((String) payload.get(OutboxSocialPublishQueue.PUBLICATION_ID)), Instant.now());
    }

    @Override
    public boolean transactional() {
        return false;
    }
}
