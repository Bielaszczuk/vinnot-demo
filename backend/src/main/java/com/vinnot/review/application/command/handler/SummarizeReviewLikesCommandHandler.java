package com.vinnot.review.application.command.handler;

import com.vinnot.review.application.command.model.SummarizeReviewLikesCommand;
import com.vinnot.review.application.port.in.SummarizeReviewLikesUseCase;
import com.vinnot.review.application.port.out.CommunityActivityNotifier;
import com.vinnot.review.application.port.out.ReviewLikeSummaryPort;
import com.vinnot.review.application.port.out.UserQueryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;
import java.util.Optional;

/**
 * One summary per member whose reviews got likes since the previous run of the same cadence, instead of a notice per
 * like: a single like names who liked, several are counted with the most liked review's wine. The cursor moves and the
 * summaries are queued in one transaction, so a failure leaves the window for the next run. A window ends a few minutes
 * before the run, so a like still being saved at the cut-off is counted by the next summary instead of being skipped.
 */
@Service
@RequiredArgsConstructor
public class SummarizeReviewLikesCommandHandler implements SummarizeReviewLikesUseCase {
    private static final Duration SETTLING_TIME = Duration.ofMinutes(5);
    private final ReviewLikeSummaryPort likes;
    private final UserQueryPort users;
    private final CommunityActivityNotifier notifier;

    @Override
    @Transactional
    public int execute(SummarizeReviewLikesCommand command) {
        ReviewLikeSummaryPort.Window window = likes.claim(command.cadence(), command.now().minus(SETTLING_TIME));
        List<ReviewLikeSummaryPort.AuthorLikes> authors = likes.likesIn(window);
        for (ReviewLikeSummaryPort.AuthorLikes author : authors) {
            String likerName = Optional.ofNullable(author.likerId()).flatMap(users::findById)
                    .map(UserQueryPort.UserData::publicName).orElse(null);
            notifier.likesSummarized(new CommunityActivityNotifier.LikesSummary(command.cadence(), author.authorId(),
                    author.likes(), author.reviews(), author.topWineId(), author.topWineName(), likerName, window.to()));
        }
        return authors.size();
    }
}
