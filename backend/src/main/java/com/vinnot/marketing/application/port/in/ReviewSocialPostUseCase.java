package com.vinnot.marketing.application.port.in;

import com.vinnot.marketing.application.model.EditSocialPostCommand;
import com.vinnot.marketing.application.model.SocialPostAdminResponse;

import java.time.Instant;
import java.util.UUID;

/** The owner's actions on the approval queue (#489). */
public interface ReviewSocialPostUseCase {
    SocialPostAdminResponse approve(UUID postId, UUID reviewer, Instant now);

    SocialPostAdminResponse reject(UUID postId, UUID reviewer, String reason, Instant now);

    SocialPostAdminResponse edit(UUID postId, EditSocialPostCommand command, UUID editor, Instant now);

    SocialPostAdminResponse regenerate(UUID postId, Instant now);

    /** Paints another hero illustration and renders the slides again (#492); the post keeps its status. */
    SocialPostAdminResponse newIllustration(UUID postId, Instant now);
}
