package com.vinnot.admin.application.port.in;

import java.time.Instant;

/** Emails the moderation team the work that arrived since the last digest (#307). */
public interface SendModerationDigestUseCase {
    /** @return how many digests were queued */
    int execute(Instant now);
}
