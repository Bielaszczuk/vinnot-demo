package com.vinnot.notification.application.port.out;

import com.vinnot.notification.application.model.AnnouncementRecord;
import com.vinnot.notification.domain.model.Announcement;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Announcements sent by administrators (#310): their audit and the cursor their batched delivery walks. */
public interface AnnouncementStorePort {
    /**
     * Stores a send; a test is stored as already completed, so it is never delivered to the audience. Returns false,
     * storing nothing, when an announcement with this id already exists (a repeated request).
     */
    boolean save(UUID id, Announcement announcement, boolean test, int recipients, Sender sender, Instant at);

    /** The send or test stored with this id. */
    Optional<AnnouncementRecord> find(UUID id);

    /** Locks the oldest announcement (never a test) still being delivered for the caller's transaction; others skip it. */
    Optional<Pending> lockNextPending();

    /** Remembers the last account queued and, once the audience is exhausted, when delivery finished. */
    void advance(UUID id, UUID lastUserId, Instant completedAt);

    /** The latest sends and tests, newest first. */
    List<AnnouncementRecord> recent(int limit);

    record Sender(UUID id, String email) {
    }

    record Pending(UUID id, Announcement announcement, UUID lastUserId) {
    }
}
