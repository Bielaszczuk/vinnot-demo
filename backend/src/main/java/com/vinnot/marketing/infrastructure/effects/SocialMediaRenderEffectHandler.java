package com.vinnot.marketing.infrastructure.effects;

import com.vinnot.marketing.application.port.in.RenderSocialMediaUseCase;
import com.vinnot.shared.infrastructure.effects.ExternalEffectHandler;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Runs a queued media render (#492) outside any transaction: the image model and the renderer are slow and the use case
 * makes its own writes durable. A retryable failure propagates so the worker backs off and tries again; the use case caps
 * its own attempts before the worker's limit.
 */
@Component
public class SocialMediaRenderEffectHandler implements ExternalEffectHandler {
    private final RenderSocialMediaUseCase render;

    public SocialMediaRenderEffectHandler(RenderSocialMediaUseCase render) {
        this.render = render;
    }

    @Override
    public boolean supports(String kind) {
        return OutboxSocialMediaRenderQueue.KIND.equals(kind);
    }

    @Override
    public void execute(String kind, Map<String, Object> payload) {
        render.render(UUID.fromString((String) payload.get(OutboxSocialMediaRenderQueue.POST_ID)), Instant.now());
    }

    @Override
    public boolean transactional() {
        return false;
    }
}
