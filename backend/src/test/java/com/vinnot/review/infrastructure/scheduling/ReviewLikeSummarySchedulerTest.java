package com.vinnot.review.infrastructure.scheduling;

import com.vinnot.review.application.command.model.SummarizeReviewLikesCommand;
import com.vinnot.review.application.port.in.SummarizeReviewLikesUseCase;
import com.vinnot.review.domain.model.LikeSummaryCadence;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReviewLikeSummarySchedulerTest {
    @Test
    void theEveningRunSendsTheDailySummaryAndTheSundayRunTheWeeklyOne() {
        var useCase = mock(SummarizeReviewLikesUseCase.class);
        when(useCase.execute(any())).thenReturn(3, 0);
        var scheduler = new ReviewLikeSummaryScheduler(useCase);

        scheduler.sendDaily();
        scheduler.sendWeekly();

        var commands = ArgumentCaptor.forClass(SummarizeReviewLikesCommand.class);
        verify(useCase, times(2)).execute(commands.capture());
        assertThat(commands.getAllValues()).extracting(SummarizeReviewLikesCommand::cadence)
                .containsExactly(LikeSummaryCadence.DAILY, LikeSummaryCadence.WEEKLY);
    }
}
