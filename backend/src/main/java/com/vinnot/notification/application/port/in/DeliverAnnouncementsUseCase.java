package com.vinnot.notification.application.port.in;

import java.time.Instant;

/** Queues the next batch of the oldest announcement still being delivered (#310). */
public interface DeliverAnnouncementsUseCase {
    /** Returns how many accounts were queued; zero when nothing is pending. */
    int execute(Instant now);
}
