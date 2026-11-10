package com.vinnot.notification.application.model;

import com.vinnot.notification.domain.model.AnnouncementAudience;
import com.vinnot.notification.domain.model.AnnouncementDestination;
import com.vinnot.notification.domain.model.AnnouncementKind;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * The audit of one announcement or test (#310): who sent what, when and to how many accounts. {@code title} is the
 * Spanish title, or the English one when only English was written; {@code completedAt} is empty while batches are
 * still being queued. {@code stats} counts what happened to its messages so far (#490).
 */
public record AnnouncementRecord(UUID id, AnnouncementKind kind, boolean test, AnnouncementAudience audience,
        AnnouncementDestination destination, String title, int recipients, String sentByEmail, Instant createdAt,
        Instant completedAt, AnnouncementStats stats) {
    public AnnouncementRecord {
        stats = Objects.requireNonNullElse(stats, AnnouncementStats.NONE);
    }

    /** A record nothing was counted for yet. */
    public AnnouncementRecord(UUID id, AnnouncementKind kind, boolean test, AnnouncementAudience audience,
            AnnouncementDestination destination, String title, int recipients, String sentByEmail, Instant createdAt,
            Instant completedAt) {
        this(id, kind, test, audience, destination, title, recipients, sentByEmail, createdAt, completedAt,
                AnnouncementStats.NONE);
    }
}
