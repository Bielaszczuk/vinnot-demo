package com.vinnot.marketing.application.port.in;

import com.vinnot.marketing.domain.model.SocialPost;

import java.time.Instant;
import java.util.UUID;

/** Writes the copy of a post with the AI port (#489). */
public interface GenerateSocialCopyUseCase {
    /** Generates one post's copy; a provider failure is recorded on the post instead of thrown. */
    SocialPost generate(UUID postId, Instant now);

    /** Retries every draft still waiting for copy; returns how many are now pending approval. */
    int generatePending(Instant now);
}
