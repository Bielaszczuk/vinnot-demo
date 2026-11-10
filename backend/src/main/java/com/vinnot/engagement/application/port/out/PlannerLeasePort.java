package com.vinnot.engagement.application.port.out;

import java.time.Duration;
import java.time.Instant;

/** One planner run at a time across instances. */
public interface PlannerLeasePort {
    /** Takes the lease until {@code now + lease} when it is free or expired. */
    boolean acquire(String holder, Instant now, Duration lease);

    /** Frees the lease if this holder still has it. */
    void release(String holder, Instant now);
}
