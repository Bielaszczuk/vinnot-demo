package com.vinnot.admin.application.query.handler;

import com.vinnot.admin.application.port.in.SearchAdminReviewsUseCase;
import com.vinnot.admin.application.port.out.ReviewQueryPort;
import com.vinnot.admin.application.port.out.UserPointsPort;
import com.vinnot.admin.application.port.out.UserQueryPort;
import com.vinnot.admin.application.port.out.WineQueryPort;
import com.vinnot.admin.application.query.model.SearchAdminReviewsQuery;
import com.vinnot.admin.application.query.response.ReviewAdminResponse;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SearchAdminReviewsQueryHandler implements SearchAdminReviewsUseCase {

    private final ReviewQueryPort reviewQueryPort;
    private final UserQueryPort userQueryPort;
    private final WineQueryPort wineQueryPort;
    private final UserPointsPort userPoints;

    @Override
    @Transactional(readOnly = true)
    public PageResult<ReviewAdminResponse> execute(SearchAdminReviewsQuery query) {
        PageQuery pageQuery = PageQuery.of(query.page(), query.size(), "createdAt", PageQuery.SortDirection.DESC);

        PageResult<ReviewQueryPort.ReviewData> reviewsPage;
        if (Objects.nonNull(query.search()) && !query.search().isBlank()) {
            reviewsPage = reviewQueryPort.searchByKeyword(query.search(), pageQuery);
        } else {
            reviewsPage = reviewQueryPort.findAll(pageQuery);
        }

        List<UUID> userIds = reviewsPage.content().stream()
                .map(ReviewQueryPort.ReviewData::userId).distinct().toList();
        List<UUID> wineIds = reviewsPage.content().stream()
                .map(ReviewQueryPort.ReviewData::wineId).distinct().toList();

        Map<UUID, UserQueryPort.UserAdminData> usersMap = userQueryPort.findAllByIds(userIds).stream()
                .collect(Collectors.toMap(UserQueryPort.UserAdminData::id, Function.identity()));
        Map<UUID, UserPointsPort.Standing> standings = userIds.isEmpty() ? Map.of() : userPoints.standings(userIds);
        Map<UUID, WineQueryPort.WineData> winesMap = wineQueryPort.findAllByIds(wineIds).stream()
                .collect(Collectors.toMap(WineQueryPort.WineData::id, Function.identity()));

        return reviewsPage.map(review -> toResponse(review, usersMap, winesMap, standings));
    }

    private ReviewAdminResponse toResponse(ReviewQueryPort.ReviewData review,
                                           Map<UUID, UserQueryPort.UserAdminData> usersMap,
                                           Map<UUID, WineQueryPort.WineData> winesMap,
                                           Map<UUID, UserPointsPort.Standing> standings) {
        UserQueryPort.UserAdminData user = usersMap.get(review.userId());
        WineQueryPort.WineData wine = winesMap.get(review.wineId());

        ReviewAdminResponse.ReviewerInfo reviewer = Objects.nonNull(user)
                ? new ReviewAdminResponse.ReviewerInfo(
                        user.id(), user.username(),
                        user.firstName() + " " + user.lastName(),
                        user.profileImageUrl(),
                        standings.getOrDefault(user.id(), UserPointsPort.Standing.NONE).badgeTier())
                : null;

        ReviewAdminResponse.WineInfo wineInfo = Objects.nonNull(wine)
                ? new ReviewAdminResponse.WineInfo(wine.id(), wine.name(), wine.vintage())
                : null;

        return new ReviewAdminResponse(
                review.id(),
                review.wineId(),
                review.userId(),
                review.rating(),
                review.title(),
                review.comment(),
                review.verified(),
                review.helpfulCount(),
                review.likesCount(),
                review.createdAt(),
                review.updatedAt(),
                reviewer,
                wineInfo
        );
    }
}

