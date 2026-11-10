package com.vinnot.review.application.command.handler;

import com.vinnot.review.application.command.model.SummarizeReviewLikesCommand;
import com.vinnot.review.application.port.out.CommunityActivityNotifier;
import com.vinnot.review.application.port.out.ReviewLikeSummaryPort;
import com.vinnot.review.application.port.out.UserQueryPort;
import com.vinnot.review.domain.model.LikeSummaryCadence;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SummarizeReviewLikesCommandHandlerTest {
    private static final Instant FROM = Instant.parse("2026-10-19T22:00:00Z");
    private static final Instant NOW = Instant.parse("2026-10-20T22:05:00Z");
    private static final Instant END = Instant.parse("2026-10-20T22:00:00Z");
    private final ReviewLikeSummaryPort likes = mock(ReviewLikeSummaryPort.class);
    private final UserQueryPort users = mock(UserQueryPort.class);
    private final CommunityActivityNotifier notifier = mock(CommunityActivityNotifier.class);
    private final SummarizeReviewLikesCommandHandler handler = new SummarizeReviewLikesCommandHandler(likes, users, notifier);

    @Test
    void eachAuthorGetsOneSummaryNamingASingleLikerUpToAFewMinutesAgo() {
        UUID ana = UUID.randomUUID();
        UUID bruno = UUID.randomUUID();
        UUID carla = UUID.randomUUID();
        UUID wine = UUID.randomUUID();
        var window = new ReviewLikeSummaryPort.Window(FROM, END);
        when(likes.claim(LikeSummaryCadence.DAILY, END)).thenReturn(window);
        when(likes.likesIn(window)).thenReturn(List.of(
                new ReviewLikeSummaryPort.AuthorLikes(ana, 3, 2, wine, "Gran Malbec", null),
                new ReviewLikeSummaryPort.AuthorLikes(bruno, 1, 1, wine, "Gran Malbec", carla)));
        when(users.findById(carla)).thenReturn(Optional.of(new UserQueryPort.UserData(carla, "carla", "Carla", "Ruiz", null)));

        assertThat(handler.execute(new SummarizeReviewLikesCommand(LikeSummaryCadence.DAILY, NOW))).isEqualTo(2);

        verify(notifier).likesSummarized(new CommunityActivityNotifier.LikesSummary(LikeSummaryCadence.DAILY, ana, 3, 2, wine,
                "Gran Malbec", null, END));
        verify(notifier).likesSummarized(new CommunityActivityNotifier.LikesSummary(LikeSummaryCadence.DAILY, bruno, 1, 1, wine,
                "Gran Malbec", "Carla Ruiz", END));
    }

    @Test
    void aWindowWithoutLikesSendsNothing() {
        var window = new ReviewLikeSummaryPort.Window(FROM, END);
        when(likes.claim(LikeSummaryCadence.WEEKLY, END)).thenReturn(window);
        when(likes.likesIn(window)).thenReturn(List.of());

        assertThat(handler.execute(new SummarizeReviewLikesCommand(LikeSummaryCadence.WEEKLY, NOW))).isZero();
        verify(notifier, never()).likesSummarized(any());
    }
}
