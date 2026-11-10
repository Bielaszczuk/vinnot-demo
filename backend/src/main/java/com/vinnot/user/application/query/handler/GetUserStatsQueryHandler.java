package com.vinnot.user.application.query.handler;

import com.vinnot.user.application.port.in.GetUserStatsUseCase;
import com.vinnot.user.application.port.out.CellarQueryPort;
import com.vinnot.user.application.port.out.EventQueryPort;
import com.vinnot.user.application.port.out.ReviewQueryPort;
import com.vinnot.user.application.query.model.GetUserStatsQuery;
import com.vinnot.user.application.query.response.UserStatsResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GetUserStatsQueryHandler implements GetUserStatsUseCase {

    private final ReviewQueryPort reviewQueryPort;
    private final CellarQueryPort cellarQueryPort;
    private final EventQueryPort eventQueryPort;

    @Override
    @Transactional(readOnly = true)
    public UserStatsResponse execute(GetUserStatsQuery query) {
        ReviewQueryPort.UserReviewStats reviewStats = reviewQueryPort.getUserReviewStats(query.userId());
        long totalCellarWines = cellarQueryPort.countByUserId(query.userId());
        int eventsAttended = (int) eventQueryPort.countRegistrationsByUserId(query.userId());

        return UserStatsResponse.of(
                reviewStats.count(),
                (int) totalCellarWines,
                eventsAttended,
                reviewStats.averageRating());
    }
}

