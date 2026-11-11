package com.vinnot.user.application.port.in;

import com.vinnot.user.application.query.model.GetPublicUserProfileQuery;
import com.vinnot.user.application.query.response.PublicUserProfileResponse;

public interface GetPublicUserProfileUseCase {
    PublicUserProfileResponse execute(GetPublicUserProfileQuery query);
}
