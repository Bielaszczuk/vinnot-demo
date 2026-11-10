package com.vinnot.review.application.query.handler;

import com.vinnot.review.application.port.in.GetReviewsByWineUseCase;
import com.vinnot.review.application.port.out.ReviewCommentRepositoryPort;
import com.vinnot.review.application.port.out.ReviewLikeRepositoryPort;
import com.vinnot.review.application.port.out.ReviewRepositoryPort;
import com.vinnot.review.application.port.out.ReviewerBadgePort;
import com.vinnot.review.application.port.out.UserQueryPort;
import com.vinnot.review.application.port.out.UserQueryPort.UserData;
import com.vinnot.review.application.query.model.GetReviewsByWineQuery;
import com.vinnot.review.application.query.response.ReviewResponse;
import com.vinnot.review.domain.model.Review;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Map;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GetReviewsByWineQueryHandler implements GetReviewsByWineUseCase {

    private final ReviewRepositoryPort reviewRepository;
    private final UserQueryPort userQueryPort;
    private final ReviewCommentRepositoryPort commentRepository;
    private final ReviewLikeRepositoryPort likeRepository;
    private final ReviewerBadgePort badges;

    @Override
    @Transactional(readOnly = true)
    public PageResult<ReviewResponse> execute(GetReviewsByWineQuery query) {
        String sortBy = resolveSortField(query.filter());
        PageQuery.SortDirection sortDir = resolveSortDirection(query.filter());
        PageQuery paging = PageQuery.of(query.page(), query.size(), sortBy, sortDir);
        PageResult<Review> reviews;
        if ("mine".equals(query.filter())) {
            var ownReview = Objects.isNull(query.currentUserId()) ? Optional.<Review>empty()
                    : reviewRepository.findByWineIdAndUserId(query.wineId(), query.currentUserId());
            reviews = PageResult.of(query.page() == 0 ? ownReview.stream().toList() : List.of(),
                    paging.page(), paging.size(), ownReview.isPresent() ? 1 : 0);
        } else {
            reviews = reviewRepository.findVisibleByWineId(query.wineId(), query.currentUserId(), paging);
        }

        Set<UUID> userIds = reviews.content().stream()
                .map(Review::getUserId)
                .collect(Collectors.toSet());

        Map<UUID, UserData> usersById = userQueryPort.findAllByIds(userIds).stream()
                .collect(Collectors.toMap(UserData::id, Function.identity()));

        Map<UUID, String> badgeByUser = userIds.isEmpty() ? Map.of() : badges.badgeTiers(userIds);

        Map<UUID, Long> reviewCountByUser =
                reviewRepository.countByUserIds(userIds);

        Set<UUID> reviewIds = reviews.content().stream()
                .map(Review::getId)
                .collect(Collectors.toSet());
        Map<UUID, Long> commentCountByReview =
                commentRepository.countByReviewIds(reviewIds);

        Set<UUID> likedReviewIds = Objects.nonNull(query.currentUserId()) && !reviewIds.isEmpty()
                ? likeRepository.findLikedReviewIdsByUserIdAndReviewIdIn(query.currentUserId(), reviewIds)
                : Collections.emptySet();

        return reviews.map(review -> {
            UserData user = usersById.get(review.getUserId());
            ReviewResponse.ReviewerInfo reviewerInfo = null;
            if (Objects.nonNull(user)) {
                String displayName = ReviewerInfoResolver.displayName(user);
                reviewerInfo = new ReviewResponse.ReviewerInfo(
                        user.id(),
                        user.username(),
                        displayName,
                        user.profileImageUrl(),
                        reviewCountByUser.getOrDefault(user.id(), 0L).intValue(),
                        badgeByUser.get(user.id())
                );
            }
            int commentsCount = commentCountByReview.getOrDefault(review.getId(), 0L).intValue();
            boolean liked = likedReviewIds.contains(review.getId());
            return ReviewResponse.fromDomain(review, reviewerInfo, null, commentsCount, liked);
        });
    }

    private String resolveSortField(String filter) {
        return switch (filter) {
            case "likes", "popular" -> "likesCount";
            case "rating_high", "rating_low" -> "rating";
            default -> "createdAt";
        };
    }

    private PageQuery.SortDirection resolveSortDirection(String filter) {
        return "rating_low".equals(filter) ? PageQuery.SortDirection.ASC : PageQuery.SortDirection.DESC;
    }
}
