package com.vinnot.admin.application.port.out;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** New moderation work and who reviews it (#307). */
public interface ModerationQueueDigest {
    /**
     * Moves the digest cursor to {@code now} and returns the window it covered, locking it for the caller's
     * transaction so two runs never report the same work.
     */
    Window claim(Instant now);

    /** Wine submissions that started waiting for review, and community reports opened, inside the window. */
    NewWork newWork(Window window);

    /** Active, not suspended administrators and moderators. */
    List<UUID> staff();

    /** @param from exclusive start; @param to inclusive end */
    record Window(Instant from, Instant to) { }

    /**
     * @param submissions  submissions waiting for review
     * @param reports      new reports
     * @param wineName     the submission's wine when there is exactly one, otherwise null
     * @param reportReason the report's reason code when there is exactly one, otherwise null
     */
    record NewWork(int submissions, int reports, String wineName, String reportReason) {
        public boolean isEmpty() {
            return submissions == 0 && reports == 0;
        }
    }
}
