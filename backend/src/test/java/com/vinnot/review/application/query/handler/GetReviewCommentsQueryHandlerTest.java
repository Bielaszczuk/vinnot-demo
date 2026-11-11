package com.vinnot.review.application.query.handler;

import com.vinnot.shared.infrastructure.storage.PublicAvatarUrlResolver;
import java.util.Map;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import com.vinnot.review.application.port.out.ReviewerBadgePort;
import com.vinnot.review.application.port.out.ReviewCommentRepositoryPort;
import com.vinnot.review.application.port.out.UserQueryPort;
import com.vinnot.review.application.query.model.GetReviewCommentsQuery;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;

class GetReviewCommentsQueryHandlerTest {
    private final ReviewerBadgePort badges = mock(ReviewerBadgePort.class);

    @Test
    void batchResolvesReviewersAndKeepsUnknownUsersNullable() {
        ReviewCommentRepositoryPort comments = mock(ReviewCommentRepositoryPort.class);
        UserQueryPort users = mock(UserQueryPort.class);
        UUID reviewId = UUID.randomUUID();
        UUID knownUser = UUID.randomUUID();
        UUID unknownUser = UUID.randomUUID();
        var first = comment(reviewId, knownUser, "First");
        var second = comment(reviewId, unknownUser, "Second");
        when(comments.findVisibleByReviewId(reviewId, null))
                .thenReturn(List.of(first, second));
        when(users.findAllByIds(any()))
                .thenReturn(List.of(new UserQueryPort.UserData(
                        knownUser, "ana", "Ana", null, "/api/uploads/avatars/ana.webp")));
        when(badges.badgeTiers(any())).thenReturn(Map.of(knownUser, "LAGAR"));

        var result = new GetReviewCommentsQueryHandler(comments, users, badges,
                new PublicAvatarUrlResolver("https://api.vinnot.test/api"))
                .execute(new GetReviewCommentsQuery(reviewId));

        assertThat(result).hasSize(2);
        assertThat(result.getFirst().reviewer().displayName()).isEqualTo("Ana");
        assertThat(result.get(1).reviewer()).isNull();
        assertThat(result.getFirst().reviewer().badgeTier()).isEqualTo("LAGAR");
        assertThat(result.getFirst().reviewer().avatarUrl())
                .isEqualTo("https://api.vinnot.test/api/uploads/avatars/ana.webp");
        assertThat(result.getFirst().reviewer().username()).isEqualTo("ana");
        assertThat(result.getFirst().content()).isEqualTo("First");
        verify(badges, times(1)).badgeTiers(any());
    }

    private ReviewCommentRepositoryPort.ReviewCommentData comment(
            UUID reviewId, UUID userId, String content) {
        return new ReviewCommentRepositoryPort.ReviewCommentData(
                UUID.randomUUID(), reviewId, userId, content, Instant.now(), Instant.now());
    }
}
