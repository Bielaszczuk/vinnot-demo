package com.vinnot.marketing.application.port.in;

import java.time.Instant;
import java.util.UUID;

/** Renders a post's hero illustration and carousel slides (#492). */
public interface RenderSocialMediaUseCase {
    /**
     * Renders the post's pending media. A missing post, a post without copy and media already ready or failed are left as
     * they are. Retryable failures are recorded and rethrown so the durable worker tries again.
     */
    void render(UUID postId, Instant now);

    /** Queues a render for every upcoming post whose media is still waiting; returns how many were queued. */
    int requestPending(Instant now);
}
