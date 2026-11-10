package com.vinnot.user.application.port.in;

import com.vinnot.user.application.query.model.GetUserByIdQuery;
import com.vinnot.user.application.query.response.UserResponse;

public interface GetUserByIdUseCase {
    UserResponse execute(GetUserByIdQuery query);
}

