package com.vinnot.admin.application.port.in;

import com.vinnot.admin.application.query.model.GetAdminUserByIdQuery;
import com.vinnot.admin.application.query.response.UserAdminResponse;

public interface GetAdminUserByIdUseCase {

    /**
     * Executes the get admin user by ID query.
     *
     * @param query the query
     * @return the user admin response
     */
    UserAdminResponse execute(GetAdminUserByIdQuery query);
}

