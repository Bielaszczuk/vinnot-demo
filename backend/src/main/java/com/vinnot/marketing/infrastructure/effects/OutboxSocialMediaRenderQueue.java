package com.vinnot.marketing.infrastructure.effects;

import com.vinnot.marketing.application.port.out.SocialMediaRenderQueue;
import com.vinnot.shared.infrastructure.effects.DurableEffectQueue;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

/**
 * One {@code external_effects} row per post, target hash (every language's copy hash, #497) and illustration version
 * (#492): a repeated request while the render is queued is ignored, and the job renders whatever the post's media targets
 * when it runs.
 */
@Component
public class OutboxSocialMediaRenderQueue implements SocialMediaRenderQueue {
    public static final String KIND = "social-media-render";
    static final String KEY_PREFIX = "social-render:";
    static final String POST_ID = "postId";
    private final DurableEffectQueue queue;

    public OutboxSocialMediaRenderQueue(DurableEffectQueue queue) {
        this.queue = queue;
    }

    @Override
    public void request(UUID postId, String targetHash, int illustrationVersion) {
        queue.enqueue(KIND, KEY_PREFIX + postId + ":" + targetHash + ":" + illustrationVersion, Map.of(POST_ID, postId.toString()),
                Duration.ZERO);
    }
}
