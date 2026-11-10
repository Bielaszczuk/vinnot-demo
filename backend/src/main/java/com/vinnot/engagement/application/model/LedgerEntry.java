package com.vinnot.engagement.application.model;

import com.vinnot.notification.domain.model.NotificationType;

import java.time.Instant;
import java.util.UUID;

/** A row of the engagement ledger: one engagement push (or held-out push) for one account. */
public record LedgerEntry(UUID userId, NotificationType type, String dedupeKey, String contentRef, Instant sentAt,
        boolean holdout) {
}
