package com.vinnot.admin.application.query.handler;

import com.vinnot.admin.application.port.in.GetAdminStatsUseCase;
import com.vinnot.admin.application.port.out.EventQueryPort;
import com.vinnot.admin.application.port.out.ReviewQueryPort;
import com.vinnot.admin.application.port.out.UserQueryPort;
import com.vinnot.admin.application.port.out.WineQueryPort;
import com.vinnot.admin.application.port.out.WineRouteQueryPort;
import com.vinnot.admin.application.port.out.WineryQueryPort;
import com.vinnot.admin.application.query.model.GetAdminStatsQuery;
import com.vinnot.admin.application.query.response.AdminStatsResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GetAdminStatsQueryHandler implements GetAdminStatsUseCase {

    private final UserQueryPort userQueryPort;
    private final WineQueryPort wineQueryPort;
    private final WineryQueryPort wineryQueryPort;
    private final EventQueryPort eventQueryPort;
    private final ReviewQueryPort reviewQueryPort;
    private final WineRouteQueryPort routeQueryPort;

    @Override
    @Transactional(readOnly = true)
    public AdminStatsResponse execute(GetAdminStatsQuery query) {
        return new AdminStatsResponse(
                userQueryPort.count(),
                wineQueryPort.count(),
                wineryQueryPort.count(),
                eventQueryPort.count(),
                reviewQueryPort.count(),
                routeQueryPort.count(),
                userQueryPort.countActiveTrue(),
                eventQueryPort.countPublished(),
                routeQueryPort.countPublished()
        );
    }
}

