package com.vinnot.marketing.domain.model;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Who approved, rejected or edited the post; {@code reason} only with a rejection, or {@link #AUTO_APPROVED} when the
 * system approved it without a reviewer (#510).
 */
public record PostReview(UUID reviewedBy, Instant reviewedAt, String reason, UUID editedBy) {
    public static final String AUTO_APPROVED = "AUTO_APPROVED";

    /** The system approved the post on its pillar's behalf: no reviewer. */
    public static PostReview automatic(Instant now) {
        return new PostReview(null, Objects.requireNonNull(now, "now"), AUTO_APPROVED, null);
    }

    /** Whether the system, not a person, approved the post. */
    public boolean isAutomatic() {
        return Objects.isNull(reviewedBy) && Objects.nonNull(reviewedAt) && AUTO_APPROVED.equals(reason);
    }

    PostReview edited(UUID editor) {
        return new PostReview(reviewedBy, reviewedAt, reason, editor);
    }
}
