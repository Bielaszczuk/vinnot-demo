package com.vinnot.event.application.port.out;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Counts registration activity per event so the organizer gets one push for a burst of it. */
public interface OrganizerActivityDigest {
    /** What the organizer is told about: new confirmed places, requests to approve and cancellations. */
    enum Activity { CONFIRMED, REQUESTED, CANCELLED }

    /**
     * Adds one activity to the event's open digest, opening one due {@code window} from now if there is none. Later
     * activity joins the open digest without moving its due time, so a steady stream still reaches the organizer.
     */
    void add(UUID eventId, UUID organizerId, Activity activity, Duration window);

    /**
     * Removes and returns up to {@code limit} digests that are due; concurrent callers never claim the same one.
     * {@code active} is false when the event is no longer published or sold out, so nothing should be pushed.
     */
    List<Due> claimDue(int limit);

    record Due(UUID eventId, UUID organizerId, String title, int confirmed, int requested, int cancelled, Instant dueAt,
            boolean active) {
    }
}
