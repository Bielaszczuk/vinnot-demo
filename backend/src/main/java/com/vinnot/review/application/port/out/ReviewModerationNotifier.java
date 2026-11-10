package com.vinnot.review.application.port.out;

import com.vinnot.review.domain.model.PublicationStatus;
import com.vinnot.review.domain.model.ReviewPublication;

import java.time.Instant;
import java.util.UUID;

/** Tells authors what moderation decided about their reviews and comments (#307). Queued in the caller's transaction. */
public interface ReviewModerationNotifier {
    /** The author learns whether their review or comment was published and, if not, the preset reason. */
    void publicationDecided(ReviewPublication content, PublicationStatus status, ReviewPublication.Decision decision, Instant at);

    /**
     * The author learns that a moderator removed their review or comment; called before the removal so the content can
     * still be described. The reporter is never named.
     *
     * @param reportReason the report's reason code when a report led to it, otherwise null
     */
    void contentRemoved(ReviewPublication.Type kind, UUID contentId, UUID authorId, String reportReason);
}
