package com.vinnot.marketing.infrastructure.effects;

import com.vinnot.marketing.application.port.out.SocialPublishQueue;
import com.vinnot.shared.infrastructure.effects.DurableEffectQueue;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

/**
 * One {@code external_effects} row per publication run (#510), joining the caller's transaction. The key carries a fresh
 * nonce so an admin retry queues the publication again even if an earlier row were still stored; a duplicate run is
 * harmless because the publishing use case claims the publication atomically before publishing. A delay (#513 S4) makes the
 * row due later, so a network with a not-before time is published then.
 */
@Component
public class OutboxSocialPublishQueue implements SocialPublishQueue {
    public static final String KIND = "social-publish";
    static final String KEY_PREFIX = "social-publish:";
    static final String PUBLICATION_ID = "publicationId";
    private final DurableEffectQueue queue;

    public OutboxSocialPublishQueue(DurableEffectQueue queue) {
        this.queue = queue;
    }

    @Override
    public void enqueue(UUID publicationId, Duration delay) {
        queue.enqueue(KIND, KEY_PREFIX + publicationId + ":" + UUID.randomUUID(), Map.of(PUBLICATION_ID, publicationId.toString()), delay);
    }
}
