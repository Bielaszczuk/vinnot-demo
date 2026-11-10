package com.vinnot.user.application.port.in;

import com.vinnot.user.application.query.model.SearchUsersQuery;
import com.vinnot.user.application.query.response.UserResponse;
import com.vinnot.shared.domain.valueobject.PageResult;

public interface SearchUsersUseCase {
    PageResult<UserResponse> execute(SearchUsersQuery query);
}

