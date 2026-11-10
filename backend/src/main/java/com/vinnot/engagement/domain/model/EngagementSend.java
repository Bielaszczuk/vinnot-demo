package com.vinnot.engagement.domain.model;

import com.vinnot.notification.domain.model.NotificationType;

import java.time.Instant;
import java.util.Objects;

/**
 * One engagement push in an account's ledger (#405).
 *
 * @param contentRef what it suggested ({@code WINE:<id>}, ...), or null
 * @param holdout    recorded for the measurement holdout: nothing was actually sent
 * @param opened     the account opened it
 */
public record EngagementSend(NotificationType type, String dedupeKey, String contentRef, Instant sentAt, boolean holdout,
        boolean opened) {
    public EngagementSend {
        Objects.requireNonNull(type, "type");
        Objects.requireNonNull(dedupeKey, "dedupeKey");
        Objects.requireNonNull(sentAt, "sentAt");
    }

    /** Whether the account actually received it (holdout rows were never sent). */
    public boolean delivered() {
        return !holdout;
    }
}
