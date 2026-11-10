package com.vinnot.user.application.port.out;

import com.vinnot.user.application.port.out.model.SecurityEvent;

import java.time.Instant;

/** The {@code security_events} audit (#482). */
public interface SecurityEventPort {

    /**
     * Stores the event once the surrounding transaction commits, or at once without one, so a rolled back action
     * leaves no event and a failed insert never rolls back the action.
     */
    void record(SecurityEvent event);

    /** Deletes up to {@code batchSize} events created before {@code cutoff}; returns how many were deleted. */
    int purgeBefore(Instant cutoff, int batchSize);
}
