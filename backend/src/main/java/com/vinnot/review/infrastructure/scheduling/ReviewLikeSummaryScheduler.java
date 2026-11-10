package com.vinnot.review.infrastructure.scheduling;

import com.vinnot.review.application.command.model.SummarizeReviewLikesCommand;
import com.vinnot.review.application.port.in.SummarizeReviewLikesUseCase;
import com.vinnot.review.domain.model.LikeSummaryCadence;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/** Sends the likes summaries (#308): a push every evening and an email every Sunday morning, Argentina time. */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.community.likes.enabled", havingValue = "true", matchIfMissing = true)
public class ReviewLikeSummaryScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(ReviewLikeSummaryScheduler.class);
    private final SummarizeReviewLikesUseCase summaries;

    @Scheduled(cron = "${app.community.likes.daily-cron:0 0 19 * * *}", zone = "${app.community.likes.zone:America/Argentina/Buenos_Aires}")
    public void sendDaily() {
        send(LikeSummaryCadence.DAILY);
    }

    @Scheduled(cron = "${app.community.likes.weekly-cron:0 0 10 * * SUN}", zone = "${app.community.likes.zone:America/Argentina/Buenos_Aires}")
    public void sendWeekly() {
        send(LikeSummaryCadence.WEEKLY);
    }

    private void send(LikeSummaryCadence cadence) {
        int queued = summaries.execute(new SummarizeReviewLikesCommand(cadence, Instant.now()));
        if (queued > 0) {
            LOGGER.info("Queued {} {} likes summary(ies)", queued, cadence);
        }
    }
}
