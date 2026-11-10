package com.vinnot.admin.application.port.in;

import com.vinnot.admin.application.query.model.SearchAdminEventsQuery;
import com.vinnot.admin.application.query.response.AdminEventSummaryResponse;
import com.vinnot.shared.domain.valueobject.PageResult;

public interface SearchAdminEventsUseCase {

    /**
     * Executes the search admin events query.
     *
     * @param query the query
     * @return page of admin event summary responses
     */
    PageResult<AdminEventSummaryResponse> execute(SearchAdminEventsQuery query);
}

