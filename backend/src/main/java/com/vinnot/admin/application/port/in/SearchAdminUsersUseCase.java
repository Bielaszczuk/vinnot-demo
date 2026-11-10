package com.vinnot.admin.application.port.in;

import com.vinnot.admin.application.query.model.SearchAdminUsersQuery;
import com.vinnot.admin.application.query.response.UserAdminResponse;
import com.vinnot.shared.domain.valueobject.PageResult;

public interface SearchAdminUsersUseCase {

    /**
     * Executes the search admin users query.
     *
     * @param query the query
     * @return page of user admin responses
     */
    PageResult<UserAdminResponse> execute(SearchAdminUsersQuery query);
}

