package com.vinnot.review.application.query.handler;

import com.vinnot.shared.infrastructure.storage.PublicAvatarUrlResolver;
import static org.mockito.Mockito.times;
import com.vinnot.review.application.port.out.ReviewerBadgePort;
import com.vinnot.review.application.port.out.ReviewCommentRepositoryPort;
import com.vinnot.review.application.port.out.ReviewLikeRepositoryPort;
import com.vinnot.review.application.port.out.ReviewRepositoryPort;
import com.vinnot.review.application.port.out.UserQueryPort;
import com.vinnot.review.application.query.model.GetReviewsByWineQuery;
import com.vinnot.review.domain.model.Review;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class GetReviewsByWineQueryHandlerTest {
    private static final PublicAvatarUrlResolver AVATARS = new PublicAvatarUrlResolver("https://api.vinnot.test/api");
    private final ReviewerBadgePort badges = mock(ReviewerBadgePort.class);

    @Test
    void resolvesSortEnrichmentCountsAndCurrentUsersLike() {
        ReviewRepositoryPort reviews = mock(ReviewRepositoryPort.class);
        UserQueryPort users = mock(UserQueryPort.class);
        ReviewCommentRepositoryPort comments = mock(ReviewCommentRepositoryPort.class);
        ReviewLikeRepositoryPort likes = mock(ReviewLikeRepositoryPort.class);
        UUID wineId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID currentUserId = UUID.randomUUID();
        Review review = Review.create(wineId, userId, BigDecimal.valueOf(4.5));
        when(reviews.findVisibleByWineId(wineId, currentUserId,
                PageQuery.of(0, 10, "rating", PageQuery.SortDirection.ASC)))
                .thenReturn(PageResult.of(List.of(review), 0, 10, 1));
        when(users.findAllByIds(Set.of(userId))).thenReturn(List.of(
                new UserQueryPort.UserData(userId, "ana", null, null, "/api/uploads/avatars/ana.webp")));
        when(reviews.countByUserIds(Set.of(userId))).thenReturn(Map.of(userId, 1L));
        when(comments.countByReviewIds(Set.of(review.getId())))
                .thenReturn(Map.of(review.getId(), 2L));
        when(likes.findLikedReviewIdsByUserIdAndReviewIdIn(
                currentUserId, Set.of(review.getId())))
                .thenReturn(Set.of(review.getId()));
        when(badges.badgeTiers(Set.of(userId))).thenReturn(Map.of(userId, "RACIMO"));

        var result = new GetReviewsByWineQueryHandler(reviews, users, comments, likes, badges, AVATARS)
                .execute(new GetReviewsByWineQuery(
                        wineId, 0, 10, "rating_low", currentUserId));

        assertThat(result.content()).singleElement().satisfies(response -> {
            assertThat(response.reviewer().displayName()).isEqualTo("ana");
            assertThat(response.commentsCount()).isEqualTo(2);
            assertThat(response.likedByCurrentUser()).isTrue();
            assertThat(response.reviewer().badgeTier()).isEqualTo("RACIMO");
            assertThat(response.reviewer().avatarUrl()).isEqualTo("https://api.vinnot.test/api/uploads/avatars/ana.webp");
            assertThat(response.reviewer().username()).isEqualTo("ana");
            assertThat(response.reviewer().totalReviews()).isEqualTo(1);
        });
        verify(badges, times(1)).badgeTiers(Set.of(userId));
    }

    @Test
    void resolvesPopularAndDefaultSortsWithoutAuthenticatedUser() {
        ReviewRepositoryPort reviews = mock(ReviewRepositoryPort.class);
        UserQueryPort users = mock(UserQueryPort.class);
        ReviewCommentRepositoryPort comments = mock(ReviewCommentRepositoryPort.class);
        ReviewLikeRepositoryPort likes = mock(ReviewLikeRepositoryPort.class);
        UUID wineId = UUID.randomUUID();
        PageResult<Review> empty = PageResult.of(List.of(), 0, 10, 0);
        when(reviews.findVisibleByWineId(wineId, null,
                PageQuery.of(0, 10, "likesCount", PageQuery.SortDirection.DESC)))
                .thenReturn(empty);
        when(reviews.findVisibleByWineId(wineId, null,
                PageQuery.of(0, 10, "createdAt", PageQuery.SortDirection.DESC)))
                .thenReturn(empty);
        when(users.findAllByIds(Set.of())).thenReturn(List.of());
        GetReviewsByWineQueryHandler handler =
                new GetReviewsByWineQueryHandler(reviews, users, comments, likes, badges, AVATARS);

        assertThat(handler.execute(new GetReviewsByWineQuery(
                wineId, 0, 10, "popular", null)).content()).isEmpty();
        assertThat(handler.execute(new GetReviewsByWineQuery(
                wineId, 0, 10, "recent", null)).content()).isEmpty();
    }
    @Test
    void ownReviewDoesNotDependOnTheRecentPageAndRetainsItsDetails() {
        ReviewRepositoryPort reviews = mock(ReviewRepositoryPort.class);
        UserQueryPort users = mock(UserQueryPort.class);
        ReviewCommentRepositoryPort comments = mock(ReviewCommentRepositoryPort.class);
        ReviewLikeRepositoryPort likes = mock(ReviewLikeRepositoryPort.class);
        UUID wine = UUID.randomUUID();
        UUID owner = UUID.randomUUID();
        Review own = Review.create(wine, owner, BigDecimal.valueOf(4));
        when(reviews.findByWineIdAndUserId(wine, owner)).thenReturn(Optional.of(own));
        when(users.findAllByIds(Set.of(owner))).thenReturn(List.of(
                new UserQueryPort.UserData(owner, "author", "Own", "Author", null)));
        when(comments.countByReviewIds(Set.of(own.getId())))
                .thenReturn(Map.of(own.getId(), 3L));
        var handler = new GetReviewsByWineQueryHandler(reviews, users, comments, likes, badges, AVATARS);

        var result = handler.execute(new GetReviewsByWineQuery(wine, 0, 1, "mine", owner));

        assertThat(result.content()).singleElement().satisfies(response -> {
            assertThat(response.id()).isEqualTo(own.getId());
            assertThat(response.reviewer().id()).isEqualTo(owner);
            assertThat(response.reviewer().displayName()).isEqualTo("Own Author");
            assertThat(response.commentsCount()).isEqualTo(3);
        });
        assertThat(result.totalElements()).isEqualTo(1);
        verify(reviews, never()).findVisibleByWineId(any(), any(), any());
        assertThat(handler.execute(new GetReviewsByWineQuery(wine, 1, 1, "mine", owner))
                .content()).isEmpty();
    }

    @Test
    void ownReviewWithoutAuthenticationOrWithoutAnExistingReviewIsEmpty() {
        ReviewRepositoryPort reviews = mock(ReviewRepositoryPort.class);
        var handler = new GetReviewsByWineQueryHandler(reviews, mock(UserQueryPort.class),
                mock(ReviewCommentRepositoryPort.class), mock(ReviewLikeRepositoryPort.class), badges, AVATARS);
        UUID wine = UUID.randomUUID();
        UUID owner = UUID.randomUUID();
        when(reviews.findByWineIdAndUserId(wine, owner)).thenReturn(Optional.empty());
        assertThat(handler.execute(new GetReviewsByWineQuery(wine, 0, 1, "mine", null))
                .totalElements()).isZero();
        verify(reviews, never()).findByWineIdAndUserId(any(), any());
        assertThat(handler.execute(new GetReviewsByWineQuery(wine, 0, 1, "mine", owner))
                .content()).isEmpty();
        verify(reviews).findByWineIdAndUserId(wine, owner);
        verify(reviews, never()).findVisibleByWineId(any(), any(), any());
    }

}
