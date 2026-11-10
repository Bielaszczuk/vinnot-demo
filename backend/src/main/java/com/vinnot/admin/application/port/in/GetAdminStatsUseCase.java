package com.vinnot.admin.application.port.in;

import com.vinnot.admin.application.query.model.GetAdminStatsQuery;
import com.vinnot.admin.application.query.response.AdminStatsResponse;

public interface GetAdminStatsUseCase {

    /**
     * Executes the get admin stats query.
     *
     * @param query the query
     * @return the admin stats response
     */
    AdminStatsResponse execute(GetAdminStatsQuery query);
}

