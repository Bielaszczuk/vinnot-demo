package com.vinnot.review.application.port.in;

import com.vinnot.review.application.command.model.SummarizeReviewLikesCommand;

/** Summarizes the likes members' reviews received (#308). */
public interface SummarizeReviewLikesUseCase {
    /** @return how many members were sent a summary */
    int execute(SummarizeReviewLikesCommand command);
}
