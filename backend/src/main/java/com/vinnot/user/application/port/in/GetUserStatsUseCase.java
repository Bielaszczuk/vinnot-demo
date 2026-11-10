package com.vinnot.user.application.port.in;

import com.vinnot.user.application.query.model.GetUserStatsQuery;
import com.vinnot.user.application.query.response.UserStatsResponse;

public interface GetUserStatsUseCase {
    UserStatsResponse execute(GetUserStatsQuery query);
}

