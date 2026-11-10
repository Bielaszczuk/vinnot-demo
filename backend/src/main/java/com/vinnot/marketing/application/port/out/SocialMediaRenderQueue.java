package com.vinnot.marketing.application.port.out;

import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostMedia;

import java.util.Objects;
import java.util.UUID;

/**
 * Queues the durable render of a post's media (#492); one request per target (every language's copy hash, #497) and
 * illustration version is enough.
 */
public interface SocialMediaRenderQueue {

    void request(UUID postId, String targetHash, int illustrationVersion);

    /** Queues the render when the post's media waits for one; otherwise does nothing. */
    default void requestFor(SocialPost post) {
        SocialPostMedia media = post.media();
        if (Objects.nonNull(media) && media.status() == SocialPostMedia.Status.PENDING) {
            request(post.id(), media.targetHash(), media.illustrationVersion());
        }
    }
}
