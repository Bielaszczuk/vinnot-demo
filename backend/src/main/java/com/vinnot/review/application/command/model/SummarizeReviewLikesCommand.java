package com.vinnot.review.application.command.model;

import com.vinnot.review.domain.model.LikeSummaryCadence;

import java.time.Instant;
import java.util.Objects;

/** Send the likes summaries of one cadence for the likes received up to {@code now} (#308). */
public record SummarizeReviewLikesCommand(LikeSummaryCadence cadence, Instant now) {
    public SummarizeReviewLikesCommand {
        Objects.requireNonNull(cadence, "cadence");
        Objects.requireNonNull(now, "now");
    }
}
