package com.vinnot.review.application.port.out;

import java.util.List;
import java.util.UUID;

/**
 * Gives and takes back the points of community activity (#455) in the caller's transaction. Every call is idempotent:
 * publishing an already rewarded review or removing content that earned nothing changes nothing.
 */
public interface ReviewPointsPort {
    /** A review is public (created, or edited while approved): its points and, for a long note, the note's. */
    void reviewPublished(UUID authorId, UUID wineId, String note);

    /**
     * A moderator approved a review: it earns its points, its note's and one point per like it holds now, under the
     * same keys as before, so a review approved again after a rejection never counts anything twice.
     *
     * @param likerIds the members who like the review now, in the order they liked it
     */
    void reviewApproved(UUID authorId, UUID wineId, UUID reviewId, String note, List<UUID> likerIds);

    /**
     * A review went back to pending or was rejected: its own points and the likes it received are revoked until it
     * is approved again.
     */
    void reviewUnpublished(UUID authorId, UUID wineId, UUID reviewId);

    /** A review was deleted (by its author or a moderator): its points and the likes it received are revoked. */
    void reviewDeleted(UUID authorId, UUID wineId, UUID reviewId);

    /** Someone (the author included) liked an approved review: its author earns a point. */
    void likeAdded(UUID authorId, UUID wineId, UUID reviewId, UUID likerId);

    void likeRemoved(UUID authorId, UUID reviewId, UUID likerId);

    /** A comment was published; only a comment on someone else's review earns a point. */
    void commentPublished(UUID commenterId, UUID reviewAuthorId, UUID wineId, UUID commentId);

    /** A comment was deleted or rejected: the commenter's point for it is revoked. */
    void commentRemoved(UUID commenterId, UUID commentId);
}
