package com.vinnot.admin.application.query.handler;

import com.vinnot.shared.application.port.AvatarUrlResolver;
import com.vinnot.admin.application.port.in.GetAdminReviewByIdUseCase;
import com.vinnot.admin.application.port.out.ReviewQueryPort;
import com.vinnot.admin.application.port.out.UserPointsPort;
import com.vinnot.admin.application.port.out.UserQueryPort;
import com.vinnot.admin.application.port.out.WineQueryPort;
import com.vinnot.admin.application.query.model.GetAdminReviewByIdQuery;
import com.vinnot.admin.application.query.response.ReviewAdminResponse;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GetAdminReviewByIdQueryHandler implements GetAdminReviewByIdUseCase {

    private final ReviewQueryPort reviewQueryPort;
    private final UserQueryPort userQueryPort;
    private final WineQueryPort wineQueryPort;
    private final UserPointsPort userPoints;
    private final AvatarUrlResolver avatars;

    @Override
    @Transactional(readOnly = true)
    public ReviewAdminResponse execute(GetAdminReviewByIdQuery query) {
        ReviewQueryPort.ReviewData review = reviewQueryPort.findById(query.reviewId())
                .orElseThrow(() -> new EntityNotFoundException("Review", query.reviewId()));

        ReviewAdminResponse.ReviewerInfo reviewer = userQueryPort.findById(review.userId())
                .map(user -> new ReviewAdminResponse.ReviewerInfo(
                        user.id(), user.username(),
                        user.firstName() + " " + user.lastName(),
                        avatars.resolve(user.profileImageUrl()),
                        userPoints.standings(List.of(user.id()))
                                .getOrDefault(user.id(), UserPointsPort.Standing.NONE).badgeTier()))
                .orElse(null);

        ReviewAdminResponse.WineInfo wineInfo = wineQueryPort.findById(review.wineId())
                .map(wine -> new ReviewAdminResponse.WineInfo(
                        wine.id(), wine.name(), wine.vintage()))
                .orElse(null);

        return new ReviewAdminResponse(
                review.id(), review.wineId(), review.userId(),
                review.rating(), review.title(), review.comment(),
                review.verified(), review.helpfulCount(), review.likesCount(),
                review.createdAt(), review.updatedAt(),
                reviewer, wineInfo
        );
    }
}

