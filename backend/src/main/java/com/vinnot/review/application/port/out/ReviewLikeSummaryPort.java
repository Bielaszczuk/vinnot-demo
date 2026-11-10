package com.vinnot.review.application.port.out;

import com.vinnot.review.domain.model.LikeSummaryCadence;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** The likes each member's reviews received in a window (#308). */
public interface ReviewLikeSummaryPort {
    /**
     * Moves the cadence's cursor to {@code now} and returns the window it covered, locking it for the caller's
     * transaction so two runs never report the same likes. The cursor never moves back.
     */
    Window claim(LikeSummaryCadence cadence, Instant now);

    /**
     * One summary per review author with likes inside the window, ordered by author. Self-likes, likes between members
     * where either blocks the other, likes on unpublished reviews or hidden wines and removed likes do not count.
     */
    List<AuthorLikes> likesIn(Window window);

    /** @param from exclusive start; @param to inclusive end */
    record Window(Instant from, Instant to) { }

    /**
     * @param authorId    the reviews' author
     * @param likes       likes received in the window
     * @param reviews     how many of the author's reviews they went to
     * @param topWineId   the wine of the most liked review
     * @param topWineName that wine as the catalogue shows it
     * @param likerId     who liked when there is exactly one like, otherwise null
     */
    record AuthorLikes(UUID authorId, int likes, int reviews, UUID topWineId, String topWineName, UUID likerId) { }
}
