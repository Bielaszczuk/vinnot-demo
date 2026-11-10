package com.vinnot.marketing.application.port.in;

import com.vinnot.marketing.application.model.SocialPostAdminResponse;

import java.time.Instant;
import java.util.UUID;

/** The owner moves a post to another date and time, or publishes it now (#513 S5/S6). */
public interface ScheduleSocialPostUseCase {

    /** Moves a post whose publishing has not started to a future time; no other post may go out that local date. */
    SocialPostAdminResponse reschedule(UUID postId, Instant scheduledFor, Instant now);

    /** Publishes an approved post with ready media now on every enabled network. */
    SocialPostAdminResponse publishNow(UUID postId, Instant now);
}
