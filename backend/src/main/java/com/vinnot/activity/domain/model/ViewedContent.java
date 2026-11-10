package com.vinnot.activity.domain.model;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * How often one piece of content was viewed in a period, by one user or by everyone.
 *
 * @param views        how many times the detail was opened
 * @param lastViewedAt the latest of those views
 */
public record ViewedContent(ContentKind kind, UUID entityId, int views, Instant lastViewedAt) {
    public ViewedContent {
        Objects.requireNonNull(kind, "Kind cannot be null");
        Objects.requireNonNull(entityId, "Content cannot be null");
        Objects.requireNonNull(lastViewedAt, "Last view cannot be null");
    }
}
