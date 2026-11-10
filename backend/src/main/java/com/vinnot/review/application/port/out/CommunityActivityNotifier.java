package com.vinnot.review.application.port.out;

import com.vinnot.review.domain.model.LikeSummaryCadence;

import java.time.Instant;
import java.util.UUID;

/** Tells members about community activity on their reviews (#308): comments and likes. Queued in the caller's transaction. */
public interface CommunityActivityNotifier {
    /**
     * A comment on someone's review was published.
     *
     * @param commentId      the published comment, which also keys the notice so it is sent once
     * @param reviewAuthorId who receives the notice
     * @param commenterName  the commenter's public name
     * @param wineId         the reviewed wine, opened from the notice
     * @param wineName       the reviewed wine as the catalogue shows it
     */
    record CommentActivity(UUID commentId, UUID reviewAuthorId, String commenterName, UUID wineId, String wineName) { }

    void commentPublished(CommentActivity activity);

    /**
     * The likes a member's reviews received since the previous summary of the same cadence: a daily summary goes by
     * push, the weekly one by email.
     *
     * @param cadence     which summary this is
     * @param authorId    who receives it
     * @param likes       likes received
     * @param reviews     how many reviews they went to
     * @param wineId      the wine of the most liked review, opened from the summary
     * @param wineName    that wine as the catalogue shows it
     * @param likerName   the public name of the only liker when there is one like, otherwise null
     * @param windowEnd   the end of the summarized window, which also keys the summary so it is sent once
     */
    record LikesSummary(LikeSummaryCadence cadence, UUID authorId, int likes, int reviews, UUID wineId, String wineName,
            String likerName, Instant windowEnd) { }

    void likesSummarized(LikesSummary summary);
}
