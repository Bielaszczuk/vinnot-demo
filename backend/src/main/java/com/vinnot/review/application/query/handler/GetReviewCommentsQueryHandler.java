package com.vinnot.review.application.query.handler;

import com.vinnot.review.application.port.in.GetReviewCommentsUseCase;
import com.vinnot.review.application.port.out.ReviewCommentRepositoryPort;
import com.vinnot.review.application.port.out.ReviewCommentRepositoryPort.ReviewCommentData;
import com.vinnot.review.application.port.out.ReviewerBadgePort;
import com.vinnot.review.application.port.out.UserQueryPort;
import com.vinnot.review.application.port.out.UserQueryPort.UserData;
import com.vinnot.review.application.query.model.GetReviewCommentsQuery;
import com.vinnot.review.application.query.response.ReviewCommentResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GetReviewCommentsQueryHandler implements GetReviewCommentsUseCase {

    private final ReviewCommentRepositoryPort commentRepository;
    private final UserQueryPort userQueryPort;
    private final ReviewerBadgePort badges;

    @Override
    @Transactional(readOnly = true)
    public List<ReviewCommentResponse> execute(GetReviewCommentsQuery query) {
        List<ReviewCommentData> comments =
                commentRepository.findVisibleByReviewId(query.reviewId(), query.viewerId());

        Set<UUID> userIds = comments.stream()
                .map(ReviewCommentData::userId)
                .collect(Collectors.toSet());

        Map<UUID, UserData> usersById = userQueryPort.findAllByIds(userIds).stream()
                .collect(Collectors.toMap(UserData::id, Function.identity()));

        Map<UUID, String> badgeByUser = userIds.isEmpty() ? Map.of() : badges.badgeTiers(userIds);

        return comments.stream().map(comment -> {
            UserData user = usersById.get(comment.userId());
            ReviewCommentResponse.ReviewerInfo reviewerInfo = null;
            if (Objects.nonNull(user)) {
                String displayName = ReviewerInfoResolver.displayName(user);
                reviewerInfo = new ReviewCommentResponse.ReviewerInfo(
                        user.id(),
                        user.username(),
                        displayName,
                        user.profileImageUrl(),
                        badgeByUser.get(user.id())
                );
            }
            return new ReviewCommentResponse(
                    comment.id(),
                    comment.reviewId(),
                    comment.createdAt(),
                    comment.updatedAt(),
                    comment.content(),
                    reviewerInfo,
                    comment.publicationStatus()
            );
        }).toList();
    }
}
